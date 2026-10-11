import net from "node:net";
import type { AgentConfig } from "./config.js";

export interface PrinterWriteResult {
  success: boolean;
  uncertain: boolean;
  bytesWritten?: number;
  error?: string;
}

export interface PrinterProbeResult {
  isOnline: boolean;
  latencyMs?: number;
  error?: string;
}

export class LocalPrinterClient {
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  /**
   * Validate that a target host and port is authorized for local hardware printing.
   * Prevents SSRF, internal network port scanning, and cloud metadata access.
   */
  validateDestination(host: string, port: number): { valid: boolean; reason?: string } {
    // 1. Port allowlist validation
    if (!this.config.allowedPorts.includes(port)) {
      return {
        valid: false,
        reason: `Port ${port} is not in the agent's authorized printer port list (${this.config.allowedPorts.join(", ")})`,
      };
    }

    const normalizedHost = host.trim().toLowerCase();

    // 2. Reject loopback and local IPC targets (unless explicitly permitted for automated unit testing)
    if (
      !this.config.allowLocalhostForTesting &&
      (normalizedHost === "localhost" ||
        normalizedHost === "127.0.0.1" ||
        normalizedHost === "::1" ||
        normalizedHost.startsWith("127."))
    ) {
      return {
        valid: false,
        reason: "Loopback address (localhost) is prohibited for network printer routing",
      };
    }

    // 3. Reject link-local metadata addresses (e.g. AWS/GCP 169.254.169.254)
    if (normalizedHost === "169.254.169.254" || normalizedHost.startsWith("169.254.")) {
      return {
        valid: false,
        reason: "Link-local cloud metadata destination is strictly prohibited",
      };
    }

    // 4. Specific host allowlist check if not wildcard
    if (!this.config.allowedHosts.includes("*")) {
      if (!this.config.allowedHosts.includes(normalizedHost)) {
        return {
          valid: false,
          reason: `Host '${normalizedHost}' is not in the configured printer host allowlist`,
        };
      }
    }

    // 5. Private subnet check if enabled
    if (this.config.allowPrivateSubnetsOnly) {
      const isPrivateLan = this.isPrivateIpAddress(normalizedHost);
      if (!isPrivateLan) {
        return {
          valid: false,
          reason: `Destination '${normalizedHost}' is not a valid private RFC 1918 LAN address`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Helper to verify if an IPv4 address is in RFC 1918 private address space.
   */
  private isPrivateIpAddress(ip: string): boolean {
    if (this.config.allowLocalhostForTesting && (ip === "127.0.0.1" || ip === "localhost")) {
      return true;
    }

    const parts = ip.split(".").map((n) => Number.parseInt(n, 10));
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
      // Non-IPv4 or hostname: allow if explicitly in allowedHosts
      return this.config.allowedHosts.includes(ip);
    }

    const [b1, b2] = parts;
    // 10.0.0.0 - 10.255.255.255 (10.0.0.0/8)
    if (b1 === 10) return true;
    // 172.16.0.0 - 172.31.255.255 (172.16.0.0/12)
    if (b1 === 172 && b2 >= 16 && b2 <= 31) return true;
    // 192.168.0.0 - 192.168.255.255 (192.168.0.0/16)
    if (b1 === 192 && b2 === 168) return true;

    return false;
  }

  /**
   * Transmit raw ESC/POS payload to local Ethernet printer over raw TCP.
   * Distinguishes definite success, definite failure, and ambiguous uncertain outcomes.
   */
  async print(host: string, port: number, buffer: Buffer): Promise<PrinterWriteResult> {
    // 1. Destination authorization check
    const validation = this.validateDestination(host, port);
    if (!validation.valid) {
      return {
        success: false,
        uncertain: false,
        error: `SECURITY_VIOLATION: ${validation.reason}`,
      };
    }

    // 2. Buffer length enforcement
    if (buffer.length > this.config.maxPayloadBytes) {
      return {
        success: false,
        uncertain: false,
        error: `Payload exceeds maximum allowable print buffer (${buffer.length} > ${this.config.maxPayloadBytes} bytes)`,
      };
    }

    // Check if deterministic simulated uncertain mode is active (for testing)
    if (this.config.simulatedUncertain) {
      return {
        success: false,
        uncertain: true,
        error: "UNCERTAIN_DELIVERY: Connection severed after partial write initiated",
      };
    }

    let writeInitiated = false;
    let bytesTransmitted = 0;

    return new Promise<PrinterWriteResult>((resolve) => {
      const socket = new net.Socket();
      let finished = false;

      const finish = (result: PrinterWriteResult) => {
        if (finished) return;
        finished = true;
        try {
          socket.removeAllListeners();
          socket.destroy();
        } catch {}
        resolve(result);
      };

      socket.setTimeout(this.config.connectTimeoutMs);

      socket.on("timeout", () => {
        if (writeInitiated) {
          finish({
            success: false,
            uncertain: true,
            error: `UNCERTAIN_DELIVERY: Printer TCP socket timed out after initiating write of ${bytesTransmitted} bytes to ${host}:${port}`,
          });
        } else {
          finish({
            success: false,
            uncertain: false,
            error: `Connection timed out connecting to printer at ${host}:${port} (${this.config.connectTimeoutMs}ms)`,
          });
        }
      });

      socket.on("error", (err: Error) => {
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
            error: `Network error connecting to printer: ${err.message}`,
          });
        }
      });

      socket.connect(port, host, () => {
        socket.setTimeout(this.config.writeTimeoutMs);
        writeInitiated = true;

        socket.write(buffer, (err?: Error | null) => {
          if (err) {
            finish({
              success: false,
              uncertain: true,
              error: `UNCERTAIN_DELIVERY: Socket write error during transmission (${err.message})`,
            });
            return;
          }

          bytesTransmitted = buffer.length;
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

  /**
   * Health probe local printer TCP socket without transmitting print data.
   */
  async probe(host: string, port: number): Promise<PrinterProbeResult> {
    const validation = this.validateDestination(host, port);
    if (!validation.valid) {
      return {
        isOnline: false,
        error: `SECURITY_VIOLATION: ${validation.reason}`,
      };
    }

    const startTime = Date.now();

    return new Promise<PrinterProbeResult>((resolve) => {
      const socket = new net.Socket();
      let finished = false;

      const finish = (res: PrinterProbeResult) => {
        if (finished) return;
        finished = true;
        try {
          socket.removeAllListeners();
          socket.destroy();
        } catch {}
        resolve(res);
      };

      socket.setTimeout(2000);

      socket.on("timeout", () => {
        finish({
          isOnline: false,
          error: `Ping timeout connecting to ${host}:${port}`,
          latencyMs: Date.now() - startTime,
        });
      });

      socket.on("error", (err: Error) => {
        finish({
          isOnline: false,
          error: err.message,
          latencyMs: Date.now() - startTime,
        });
      });

      socket.connect(port, host, () => {
        finish({
          isOnline: true,
          latencyMs: Date.now() - startTime,
        });
      });
    });
  }
}
