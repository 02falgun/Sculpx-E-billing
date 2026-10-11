import net from "node:net";
import type { Printer } from "@prisma/client";
import type { IPrinterAdapter, PrinterAdapterResult, PrinterHealthResult } from "./types.js";
import { logger } from "../../lib/logger.js";

export interface NetworkAdapterOptions {
  connectTimeoutMs?: number;
  writeTimeoutMs?: number;
  maxPayloadBytes?: number;
}

export class NetworkEscPosAdapter implements IPrinterAdapter {
  public readonly adapterName = "NETWORK_ESC_POS_ADAPTER";

  private connectTimeoutMs: number;
  private writeTimeoutMs: number;
  private maxPayloadBytes: number;

  constructor(options: NetworkAdapterOptions = {}) {
    this.connectTimeoutMs = options.connectTimeoutMs || 3000;
    this.writeTimeoutMs = options.writeTimeoutMs || 5000;
    this.maxPayloadBytes = options.maxPayloadBytes || 256 * 1024; // 256 KB max
  }

  async print(printer: Printer, data: Buffer | string): Promise<PrinterAdapterResult> {
    const rawBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");

    if (rawBuffer.length > this.maxPayloadBytes) {
      return {
        success: false,
        uncertain: false,
        error: `Payload exceeds maximum allowable hardware print buffer (${rawBuffer.length} > ${this.maxPayloadBytes} bytes)`,
      };
    }

    const host = printer.ipAddress;
    const port = printer.port || 9100;

    let bytesTransmitted = 0;
    let writeInitiated = false;

    return new Promise<PrinterAdapterResult>((resolve) => {
      const socket = new net.Socket();
      let resolved = false;

      const finish = (result: PrinterAdapterResult) => {
        if (resolved) return;
        resolved = true;
        try {
          socket.removeAllListeners();
          socket.destroy();
        } catch {}
        resolve(result);
      };

      socket.setTimeout(this.connectTimeoutMs);

      socket.on("timeout", () => {
        logger.warn({
          msg: "Network printer socket timed out",
          printerId: printer.id,
          host,
          port,
          writeInitiated,
        });

        if (writeInitiated) {
          // If write was initiated but timed out, outcome is ambiguous
          finish({
            success: false,
            uncertain: true,
            error: `UNCERTAIN_DELIVERY: TCP socket timed out after transmitting ${bytesTransmitted} bytes to ${host}:${port}`,
          });
        } else {
          finish({
            success: false,
            uncertain: false,
            error: `Connection timed out connecting to printer at ${host}:${port}`,
          });
        }
      });

      socket.on("error", (err: Error) => {
        logger.warn({
          msg: "Network printer socket error",
          printerId: printer.id,
          host,
          port,
          error: err.message,
          writeInitiated,
        });

        if (writeInitiated) {
          finish({
            success: false,
            uncertain: true,
            error: `UNCERTAIN_DELIVERY: Connection failed after write initiated (${err.message})`,
          });
        } else {
          finish({
            success: false,
            uncertain: false,
            error: `Network error: ${err.message}`,
          });
        }
      });

      socket.connect(port, host, () => {
        // Connected successfully, extend timeout for write operation
        socket.setTimeout(this.writeTimeoutMs);
        writeInitiated = true;

        socket.write(rawBuffer, (err) => {
          if (err) {
            finish({
              success: false,
              uncertain: true,
              error: `UNCERTAIN_DELIVERY: Socket write error (${err.message})`,
            });
            return;
          }

          bytesTransmitted = rawBuffer.length;
          socket.end(() => {
            finish({
              success: true,
              uncertain: false,
              bytesWritten: bytesTransmitted,
            });
          });
        });
      });
    });
  }

  async checkHealth(printer: Printer): Promise<PrinterHealthResult> {
    const host = printer.ipAddress;
    const port = printer.port || 9100;
    const startTime = Date.now();

    return new Promise<PrinterHealthResult>((resolve) => {
      const socket = new net.Socket();
      let resolved = false;

      const finish = (result: PrinterHealthResult) => {
        if (resolved) return;
        resolved = true;
        try {
          socket.removeAllListeners();
          socket.destroy();
        } catch {}
        resolve(result);
      };

      socket.setTimeout(2000);

      socket.on("timeout", () => {
        finish({
          isOnline: false,
          error: `Ping timeout connecting to ${host}:${port}`,
          latencyMs: Date.now() - startTime,
        });
      });

      socket.on("error", (err) => {
        finish({
          isOnline: false,
          error: err.message,
          latencyMs: Date.now() - startTime,
        });
      });

      socket.connect(port, host, () => {
        const latencyMs = Date.now() - startTime;
        finish({
          isOnline: true,
          latencyMs,
          details: {
            host,
            port,
            protocol: "RAW_TCP_ESC_POS",
          },
        });
      });
    });
  }
}
