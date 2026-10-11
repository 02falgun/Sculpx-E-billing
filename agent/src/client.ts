import os from "node:os";
import WebSocket from "ws";
import type { AgentConfig } from "./config.js";
import { LocalPrinterClient } from "./printer-client.js";
import type {
  GatewayInboundFrame,
  PrintRequestFrame,
  HealthCheckRequestFrame,
} from "./types.js";

export class LocalPrintAgentClient {
  private config: AgentConfig;
  private printerClient: LocalPrinterClient;
  private socket: WebSocket | null = null;
  private isRunning = false;
  private isExplicitlyClosed = false;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private activeJobsInProgress = new Set<string>();

  constructor(config: AgentConfig) {
    this.config = config;
    this.printerClient = new LocalPrinterClient(config);
  }

  /**
   * Start the agent: establishes outbound WSS connection and registers lifecycle hooks.
   */
  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isExplicitlyClosed = false;
    this.connect();
  }

  /**
   * Connect or reconnect to the cloud gateway.
   */
  private connect(): void {
    if (this.isExplicitlyClosed) return;

    this.log("info", `Connecting to cloud print gateway at ${this.config.cloudUrl}...`);

    try {
      this.socket = new WebSocket(this.config.cloudUrl, {
        headers: {
          "x-agent-id": this.config.deviceId,
          "x-agent-key": this.config.apiKey,
        },
      });

      this.socket.on("open", () => {
        this.log("info", "Connected to cloud print gateway; initiating handshake...");
        this.reconnectAttempts = 0;

        // Send in-band AGENT_HELLO frame
        this.sendFrame({
          type: "AGENT_HELLO",
          deviceId: this.config.deviceId,
          apiKey: this.config.apiKey,
          version: "1.0.0",
          hostname: os.hostname(),
          metadata: {
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version,
          },
        });
      });

      this.socket.on("message", (data: WebSocket.RawData) => {
        this.handleMessage(data);
      });

      this.socket.on("close", (code: number, reason: Buffer) => {
        const reasonStr = reason.toString("utf8");
        this.log("warn", `Gateway connection closed (code: ${code}, reason: ${reasonStr || "none"})`);
        this.cleanupSocket();

        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      });

      this.socket.on("error", (err: Error) => {
        this.log("warn", `Gateway socket error: ${err.message}`);
      });
    } catch (err: unknown) {
      this.log("error", `Failed to initialize WebSocket client: ${err instanceof Error ? err.message : String(err)}`);
      this.scheduleReconnect();
    }
  }

  /**
   * Handle incoming framed message from cloud gateway.
   */
  private async handleMessage(data: WebSocket.RawData): Promise<void> {
    try {
      const rawStr = data.toString("utf8");
      const frame = JSON.parse(rawStr) as GatewayInboundFrame;

      switch (frame.type) {
        case "AGENT_WELCOME": {
          this.log("info", `Handshake successful. Registered to tenant ${frame.tenantId} (Agent ID: ${frame.agentId})`);
          this.startHeartbeat(frame.heartbeatIntervalMs || this.config.heartbeatIntervalMs);
          break;
        }

        case "AGENT_PONG": {
          // Heartbeat acknowledged by gateway
          break;
        }

        case "AGENT_ERROR": {
          this.log("warn", `Gateway reported error: [${frame.code}] ${frame.message}`);
          break;
        }

        case "PRINT_REQUEST": {
          await this.processPrintRequest(frame);
          break;
        }

        case "HEALTH_CHECK_REQUEST": {
          await this.processHealthCheckRequest(frame);
          break;
        }

        default:
          this.log("warn", `Unknown frame type received: ${(frame as any).type}`);
          break;
      }
    } catch (err: unknown) {
      this.log("error", `Error processing inbound gateway message: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  /**
   * Process incoming PRINT_REQUEST:
   * 1. Send AGENT_ACK stage: RECEIVED.
   * 2. Transmit to local printer socket.
   * 3. Send AGENT_ACK stage: PRINTED | FAILED | UNCERTAIN.
   */
  private async processPrintRequest(req: PrintRequestFrame): Promise<void> {
    const { requestId, jobId, printerHost, printerPort, payloadBase64, printerName, bytesLength } = req;

    this.log("info", `Received print job ${jobId} (${bytesLength} bytes) for printer '${printerName}' (${printerHost}:${printerPort})`);
    this.activeJobsInProgress.add(requestId);

    // Stage 1: Send RECEIVED acknowledgement immediately to confirm receipt into agent memory
    this.sendFrame({
      type: "AGENT_ACK",
      requestId,
      jobId,
      stage: "RECEIVED",
      timestamp: new Date().toISOString(),
    });

    try {
      const buffer = Buffer.from(payloadBase64, "base64");

      // Stage 2: Attempt raw TCP socket write to local printer hardware
      const outcome = await this.printerClient.print(printerHost, printerPort, buffer);

      if (outcome.success) {
        this.log("info", `Job ${jobId} successfully written to printer buffer (${outcome.bytesWritten} bytes)`);
        this.sendFrame({
          type: "AGENT_ACK",
          requestId,
          jobId,
          stage: "PRINTED",
          bytesWritten: outcome.bytesWritten,
          timestamp: new Date().toISOString(),
        });
      } else if (outcome.uncertain) {
        this.log("warn", `Job ${jobId} resulted in UNCERTAIN delivery: ${outcome.error}`);
        this.sendFrame({
          type: "AGENT_ACK",
          requestId,
          jobId,
          stage: "UNCERTAIN",
          error: outcome.error,
          timestamp: new Date().toISOString(),
        });
      } else {
        this.log("warn", `Job ${jobId} failed to write to printer: ${outcome.error}`);
        this.sendFrame({
          type: "AGENT_ACK",
          requestId,
          jobId,
          stage: "FAILED",
          error: outcome.error,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      this.log("error", `Unexpected error during print processing for job ${jobId}: ${errMsg}`);
      this.sendFrame({
        type: "AGENT_ACK",
        requestId,
        jobId,
        stage: "FAILED",
        error: errMsg,
        timestamp: new Date().toISOString(),
      });
    } finally {
      this.activeJobsInProgress.delete(requestId);
    }
  }

  /**
   * Process incoming HEALTH_CHECK_REQUEST: probe printer TCP port and return result.
   */
  private async processHealthCheckRequest(req: HealthCheckRequestFrame): Promise<void> {
    const probe = await this.printerClient.probe(req.host, req.port);

    this.sendFrame({
      type: "HEALTH_CHECK_RESULT",
      requestId: req.requestId,
      printerId: req.printerId,
      isOnline: probe.isOnline,
      latencyMs: probe.latencyMs,
      error: probe.error,
    });
  }

  /**
   * Send JSON frame to cloud gateway.
   */
  private sendFrame(frame: Record<string, unknown>): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(frame));
      } catch (err) {
        this.log("warn", `Failed to send WebSocket frame: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  /**
   * Start keepalive heartbeat timer.
   */
  private startHeartbeat(intervalMs: number): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      this.sendFrame({
        type: "AGENT_PING",
        timestamp: new Date().toISOString(),
      });
    }, intervalMs);

    if (this.heartbeatTimer.unref) {
      this.heartbeatTimer.unref();
    }
  }

  /**
   * Schedule reconnect with exponential backoff and jitter.
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.isExplicitlyClosed) return;

    this.reconnectAttempts++;
    // Exponential backoff capped at 30 seconds + random jitter (0-1000ms)
    const baseBackoff = Math.min(30000, 1000 * Math.pow(1.5, Math.min(this.reconnectAttempts, 8)));
    const jitter = Math.floor(Math.random() * 1000);
    const delayMs = baseBackoff + jitter;

    this.log("info", `Scheduling reconnect attempt ${this.reconnectAttempts} in ${delayMs}ms...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delayMs);
  }

  /**
   * Cleanup socket and heartbeat timers.
   */
  private cleanupSocket(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.socket) {
      try {
        this.socket.removeAllListeners();
        this.socket.terminate();
      } catch {}
      this.socket = null;
    }
  }

  /**
   * Stop the agent gracefully: closes connections and waits up to 5s for in-flight jobs.
   */
  async stop(drainTimeoutMs = 5000): Promise<void> {
    this.isExplicitlyClosed = true;
    this.isRunning = false;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.activeJobsInProgress.size > 0) {
      this.log("info", `Waiting up to ${drainTimeoutMs}ms for ${this.activeJobsInProgress.size} active print jobs to finish...`);
      const start = Date.now();
      while (this.activeJobsInProgress.size > 0 && Date.now() - start < drainTimeoutMs) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    if (this.socket) {
      try {
        this.socket.close(1000, "AGENT_SHUTDOWN");
      } catch {}
      this.cleanupSocket();
    }

    this.log("info", "Local print agent stopped cleanly");
  }

  /**
   * Sanitized logging helper that never logs credentials or raw print binary.
   */
  private log(level: "debug" | "info" | "warn" | "error", message: string): void {
    const timestamp = new Date().toISOString();
    const prefix = `[LocalPrintAgent ${timestamp}] [${level.toUpperCase()}]`;
    if (level === "error") {
      console.error(`${prefix} ${message}`);
    } else if (level === "warn") {
      console.warn(`${prefix} ${message}`);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  /**
   * Check connection status.
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }
}
