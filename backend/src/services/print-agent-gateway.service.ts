import crypto from "node:crypto";
import type { FastifyRequest } from "fastify";
import type { RawData, WebSocket } from "ws";
import type { Prisma, PrintAgent, Printer } from "@prisma/client";
import { BadRequestError, ConflictError, NotFoundError } from "../lib/errors.js";
import { ErrorCode } from "../constants/error-codes.js";
import { printAgentModel } from "../models/print-agent.model.js";
import { printerModel } from "../models/printer.model.js";
import { logger } from "../lib/logger.js";
import { websocketService } from "./websocket.service.js";
import {
  MAX_PRINT_JOB_FRAME_BYTES,
  agentInboundFrameSchema,
  type AgentAckPayload,
  type AgentHealthCheckResultPayload,
} from "../validations/print-agent.validation.js";
import type { PrintContext, PrinterAdapterResult, PrinterHealthResult } from "../types/printer.types.js";
import type {
  AgentOutboundFrame,
  ConnectedAgentDevice,
  PrintRequestFrame,
  RegisterPrintAgentInput,
} from "../types/print-agent.types.js";

interface PendingJobRequest {
  requestId: string;
  jobId: string;
  printerId: string;
  agentId: string;
  stage: "PENDING" | "RECEIVED" | "COMPLETED";
  timeoutTimer: NodeJS.Timeout;
  resolve: (result: PrinterAdapterResult) => void;
}

interface PendingHealthRequest {
  requestId: string;
  printerId: string;
  agentId: string;
  timeoutTimer: NodeJS.Timeout;
  resolve: (result: PrinterHealthResult) => void;
}

function hashApiKey(apiKey: string): string {
  return crypto.createHash("sha256").update(apiKey).digest("hex");
}

function generateApiKey(): { plainApiKey: string; apiKeyHash: string } {
  const plainApiKey = `sculpx_ag_${crypto.randomBytes(24).toString("hex")}`;
  return { plainApiKey, apiKeyHash: hashApiKey(plainApiKey) };
}

/** Close a socket, ignoring errors from an already-closed or broken connection. */
function closeQuietly(socket: WebSocket, code: number, reason: string): void {
  try {
    socket.close(code, reason);
  } catch {}
}

function rawDataToBuffer(raw: RawData): Buffer {
  if (Buffer.isBuffer(raw)) return raw;
  return Array.isArray(raw) ? Buffer.concat(raw) : Buffer.from(raw);
}

export class PrintAgentGatewayService {
  /** Keyed by agentId. */
  private connectedAgents = new Map<string, ConnectedAgentDevice>();
  /** Keyed by requestId. */
  private pendingJobRequests = new Map<string, PendingJobRequest>();
  /** Keyed by requestId. */
  private pendingHealthRequests = new Map<string, PendingHealthRequest>();

  /**
   * Register a new print agent device for a tenant.
   * Only the SHA-256 hash of the generated API key is stored; the plain key is returned once.
   */
  async registerAgent(
    tenantId: string,
    input: RegisterPrintAgentInput
  ): Promise<{ agent: PrintAgent; apiKey: string }> {
    const existing = await printAgentModel.findByDeviceId(input.deviceId);

    if (existing) {
      throw new ConflictError(`Device ID '${input.deviceId}' is already registered`, ErrorCode.DEVICE_ALREADY_EXISTS);
    }

    if (input.permittedPrinterIds && input.permittedPrinterIds.length > 0) {
      const printers = await printerModel.findManyByIdsInTenant(tenantId, input.permittedPrinterIds);

      if (printers.length !== input.permittedPrinterIds.length) {
        throw new BadRequestError("One or more permitted printers do not exist or belong to another tenant", ErrorCode.INVALID_PRINTER_ASSIGNMENT);
      }
    }

    const { plainApiKey, apiKeyHash } = generateApiKey();

    const agent = await printAgentModel.create({
      tenantId,
      name: input.name.trim(),
      deviceId: input.deviceId.trim(),
      apiKeyHash,
      status: "ACTIVE",
      permittedPrinterIds: input.permittedPrinterIds || [],
      // Validated as z.record(z.unknown()) from a JSON body, so it is JSON-serialisable.
      metadata: input.metadata as Prisma.InputJsonObject | undefined,
    });

    if (input.permittedPrinterIds && input.permittedPrinterIds.length > 0) {
      await printerModel.updateManyByIds(input.permittedPrinterIds, {
        agentId: agent.id,
        connectionType: "LOCAL_AGENT",
      });
    }

    logger.info({
      event: "print_agent_registered",
      agentId: agent.id,
      deviceId: agent.deviceId,
      tenantId,
    });

    return { agent, apiKey: plainApiKey };
  }

  /**
   * List all registered agents for tenant with live connection status.
   */
  async listAgents(tenantId: string) {
    const agents = await printAgentModel.findManyForTenant(tenantId);

    return agents.map((a) => ({
      ...a,
      apiKeyHash: undefined, // Never expose hash to clients
      isConnected: this.connectedAgents.has(a.id),
    }));
  }

  /**
   * Get agent by ID with tenant scoping.
   */
  async getAgentById(tenantId: string, agentId: string) {
    const agent = await printAgentModel.findById(agentId);

    if (!agent || agent.tenantId !== tenantId) {
      throw new NotFoundError("Print agent not found", ErrorCode.AGENT_NOT_FOUND);
    }

    return {
      ...agent,
      apiKeyHash: undefined,
      isConnected: this.connectedAgents.has(agent.id),
    };
  }

  /**
   * Rotate agent API key.
   * Immediately invalidates previous credential and disconnects any active socket.
   */
  async rotateApiKey(tenantId: string, agentId: string): Promise<{ apiKey: string }> {
    const agent = await this.getAgentById(tenantId, agentId);

    const { plainApiKey, apiKeyHash } = generateApiKey();

    await printAgentModel.update(agent.id, { apiKeyHash });

    const active = this.connectedAgents.get(agent.id);
    if (active) {
      closeQuietly(active.socket, 4001, "API_KEY_ROTATED: Please reconnect with new credential");
      void this.handleAgentDisconnect(agent.id, 4001, "API_KEY_ROTATED");
    }

    logger.info({
      event: "print_agent_key_rotated",
      agentId: agent.id,
      tenantId,
    });

    return { apiKey: plainApiKey };
  }

  /**
   * Revoke agent authorization.
   * Marks device REVOKED and terminates active connection immediately.
   */
  async revokeAgent(tenantId: string, agentId: string): Promise<void> {
    const agent = await this.getAgentById(tenantId, agentId);

    await printAgentModel.update(agent.id, {
      status: "REVOKED",
      isOnline: false,
      lastDisconnectedAt: new Date(),
    });

    const active = this.connectedAgents.get(agent.id);
    if (active) {
      closeQuietly(active.socket, 4003, "AGENT_REVOKED: Device authorization has been revoked");
      void this.handleAgentDisconnect(agent.id, 4003, "AGENT_REVOKED");
    }

    await printerModel.updateManyByAgent(agent.id, { isOnline: false });

    logger.warn({
      event: "print_agent_revoked",
      agentId: agent.id,
      tenantId,
    });
  }

  /**
   * Replace the set of printers an agent is permitted to service.
   */
  async bindPrinters(tenantId: string, agentId: string, printerIds: string[]) {
    const agent = await this.getAgentById(tenantId, agentId);

    if (printerIds.length > 0) {
      const count = await printerModel.countByIdsInTenant(tenantId, printerIds);
      if (count !== printerIds.length) {
        throw new BadRequestError("One or more printer IDs do not belong to tenant", ErrorCode.INVALID_PRINTERS);
      }
    }

    await printerModel.updateManyByAgent(agent.id, { agentId: null });

    if (printerIds.length > 0) {
      await printerModel.updateManyByIds(printerIds, { agentId: agent.id, connectionType: "LOCAL_AGENT" });
    }

    const updated = await printAgentModel.updateWithPrinters(agent.id, { permittedPrinterIds: printerIds });

    const active = this.connectedAgents.get(agent.id);
    if (active) {
      active.permittedPrinterIds = new Set(printerIds);
    }

    return {
      ...updated,
      apiKeyHash: undefined,
    };
  }

  /**
   * Handle incoming WebSocket connection from Local Print Agent (/ws/print-agent).
   * Credentials come either from upgrade headers or an in-band AGENT_HELLO frame.
   */
  async handleConnection(socket: WebSocket, req: FastifyRequest): Promise<void> {
    const remoteAddress = req.ip || "unknown";
    let authenticatedAgent: ConnectedAgentDevice | null = null;
    let handshakeTimeoutTimer: NodeJS.Timeout | null = null;

    const headerDeviceId = (req.headers["x-agent-id"] || req.headers["x-device-id"]) as string | undefined;
    const headerApiKey = (req.headers["x-agent-key"] || req.headers["x-api-key"]) as string | undefined;

    const performAuth = async (deviceId: string, apiKey: string): Promise<boolean> => {
      try {
        const agent = await printAgentModel.findByDeviceIdWithPrinters(deviceId);

        if (!agent) {
          logger.warn({ event: "agent_auth_failed", reason: "DEVICE_NOT_FOUND", deviceId });
          return false;
        }

        if (agent.status !== "ACTIVE") {
          logger.warn({ event: "agent_auth_failed", reason: `AGENT_${agent.status}`, deviceId });
          return false;
        }

        const incomingHash = hashApiKey(apiKey);
        const storedHash = agent.apiKeyHash;

        if (
          incomingHash.length !== storedHash.length ||
          !crypto.timingSafeEqual(Buffer.from(incomingHash), Buffer.from(storedHash))
        ) {
          logger.warn({ event: "agent_auth_failed", reason: "INVALID_KEY_HASH", deviceId });
          return false;
        }

        // Split-brain protection: a new connection replaces any existing one for this agent.
        const existing = this.connectedAgents.get(agent.id);
        if (existing && existing.socket !== socket) {
          closeQuietly(existing.socket, 4009, "NEW_CONNECTION_REPLACED");
          this.connectedAgents.delete(agent.id);
        }

        // Permitted = explicit ID list plus printers bound via agentId.
        const permitted = new Set<string>(agent.permittedPrinterIds);
        agent.printers.forEach((p) => permitted.add(p.id));

        authenticatedAgent = {
          agentId: agent.id,
          deviceId: agent.deviceId,
          tenantId: agent.tenantId,
          name: agent.name,
          socket,
          remoteAddress,
          connectedAt: new Date(),
          lastHeartbeatAt: new Date(),
          permittedPrinterIds: permitted,
        };

        this.connectedAgents.set(agent.id, authenticatedAgent);

        await printAgentModel.update(agent.id, {
          isOnline: true,
          lastConnectedAt: new Date(),
          lastHeartbeatAt: new Date(),
          ipAddress: remoteAddress,
        });

        if (permitted.size > 0) {
          await printerModel.updateManyByIds(Array.from(permitted), { isOnline: true });
        }

        if (handshakeTimeoutTimer) {
          clearTimeout(handshakeTimeoutTimer);
          handshakeTimeoutTimer = null;
        }

        this.sendFrame(socket, {
          type: "AGENT_WELCOME",
          agentId: agent.id,
          tenantId: agent.tenantId,
          heartbeatIntervalMs: 15000,
          maxPayloadBytes: MAX_PRINT_JOB_FRAME_BYTES,
          permittedPrinterIds: Array.from(permitted),
        });

        this.broadcastAgentStatus(authenticatedAgent, "CONNECTED");

        logger.info({
          event: "print_agent_connected",
          agentId: agent.id,
          deviceId: agent.deviceId,
          tenantId: agent.tenantId,
          remoteAddress,
        });

        return true;
      } catch (err: unknown) {
        logger.error({
          event: "print_agent_auth_exception",
          deviceId,
          error: err instanceof Error ? err.message : String(err),
        });
        return false;
      }
    };

    if (headerDeviceId && headerApiKey) {
      await performAuth(headerDeviceId, headerApiKey);
    } else {
      // Allow a 5s window for the in-band AGENT_HELLO frame.
      handshakeTimeoutTimer = setTimeout(() => {
        if (!authenticatedAgent) {
          logger.warn({ event: "agent_handshake_timeout", remoteAddress });
          closeQuietly(socket, 4008, "HANDSHAKE_TIMEOUT");
        }
      }, 5000);
    }

    socket.on("message", async (raw: RawData) => {
      try {
        const data = rawDataToBuffer(raw);
        const byteLength = data.length;

        if (byteLength > MAX_PRINT_JOB_FRAME_BYTES) {
          logger.warn({
            event: "agent_frame_oversized",
            byteLength,
            maxAllowed: MAX_PRINT_JOB_FRAME_BYTES,
          });
          this.sendFrame(socket, {
            type: "AGENT_ERROR",
            code: "FRAME_TOO_LARGE",
            message: `Frame size of ${byteLength} bytes exceeds allowable limit (${MAX_PRINT_JOB_FRAME_BYTES} bytes)`,
          });
          return;
        }

        const parsed: unknown = JSON.parse(data.toString("utf8"));

        // Before authentication only AGENT_HELLO is accepted. This is a loose check (the schema runs
        // after auth); a `null` frame throws here and is reported as MALFORMED_JSON below.
        if (!authenticatedAgent) {
          const hello = parsed as { type?: unknown; deviceId?: unknown; apiKey?: unknown };
          if (hello.type === "AGENT_HELLO" && hello.deviceId && hello.apiKey) {
            const ok = await performAuth(String(hello.deviceId), String(hello.apiKey));
            if (!ok) {
              this.sendFrame(socket, {
                type: "AGENT_ERROR",
                code: "AUTH_FAILED",
                message: "Invalid device credentials or revoked agent",
              });
              socket.close(4003, "AUTH_FAILED");
            }
          } else {
            this.sendFrame(socket, {
              type: "AGENT_ERROR",
              code: "UNAUTHENTICATED",
              message: "Initial frame must be AGENT_HELLO with valid credentials",
            });
            socket.close(4001, "UNAUTHENTICATED");
          }
          return;
        }

        const validation = agentInboundFrameSchema.safeParse(parsed);
        if (!validation.success) {
          this.sendFrame(socket, {
            type: "AGENT_ERROR",
            code: "INVALID_SCHEMA",
            message: "Inbound frame did not match agent protocol schema",
          });
          return;
        }

        const frame = validation.data;
        switch (frame.type) {
          case "AGENT_PING":
            authenticatedAgent.lastHeartbeatAt = new Date();
            this.sendFrame(socket, { type: "AGENT_PONG", timestamp: new Date().toISOString() });
            break;
          case "AGENT_ACK":
            this.handleAgentAck(authenticatedAgent, frame);
            break;
          case "HEALTH_CHECK_RESULT":
            this.handleHealthCheckResult(authenticatedAgent, frame);
            break;
        }
      } catch (err: unknown) {
        logger.warn({
          event: "agent_message_parse_error",
          error: err instanceof Error ? err.message : String(err),
        });
        this.sendFrame(socket, {
          type: "AGENT_ERROR",
          code: "MALFORMED_JSON",
          message: "Could not parse JSON frame",
        });
      }
    });

    socket.on("close", (code, reason) => {
      if (handshakeTimeoutTimer) {
        clearTimeout(handshakeTimeoutTimer);
      }
      if (authenticatedAgent) {
        void this.handleAgentDisconnect(authenticatedAgent.agentId, code, reason.toString("utf8"));
      }
    });

    socket.on("error", (err) => {
      logger.warn({
        event: "agent_socket_error",
        agentId: authenticatedAgent?.agentId,
        error: err.message,
      });
    });
  }

  /**
   * Handle agent disconnect: clean up memory state, settle in-flight requests, and update DB.
   */
  private async handleAgentDisconnect(agentId: string, code: number, reason: string): Promise<void> {
    const agent = this.connectedAgents.get(agentId);
    this.connectedAgents.delete(agentId);
    if (!agent) return;

    logger.info({
      event: "print_agent_disconnected",
      agentId,
      deviceId: agent.deviceId,
      code,
      reason,
    });

    this.broadcastAgentStatus(agent, "DISCONNECTED");

    try {
      await printAgentModel.update(agentId, {
        isOnline: false,
        lastDisconnectedAt: new Date(),
      });

      if (agent.permittedPrinterIds.size > 0) {
        await printerModel.updateManyByIds(Array.from(agent.permittedPrinterIds), { isOnline: false });
      }
    } catch (err) {
      logger.warn({ msg: "Failed to persist agent offline status", err });
    }

    // A job the agent already RECEIVED may have printed, so it settles as UNCERTAIN.
    for (const [requestId, req] of this.pendingJobRequests.entries()) {
      if (!agent.permittedPrinterIds.has(req.printerId)) continue;

      clearTimeout(req.timeoutTimer);
      this.pendingJobRequests.delete(requestId);

      if (req.stage === "RECEIVED") {
        req.resolve({
          success: false,
          uncertain: true,
          error: "UNCERTAIN_DELIVERY: Local agent disconnected after receiving print job payload",
        });
      } else {
        req.resolve({
          success: false,
          uncertain: false,
          error: `AGENT_DISCONNECTED: Connection dropped before job processing (${reason})`,
        });
      }
    }

    for (const [requestId, req] of this.pendingHealthRequests.entries()) {
      if (!agent.permittedPrinterIds.has(req.printerId)) continue;

      clearTimeout(req.timeoutTimer);
      this.pendingHealthRequests.delete(requestId);
      req.resolve({
        isOnline: false,
        error: "Local print agent disconnected during probe",
      });
    }
  }

  /**
   * Handle structured acknowledgement from agent.
   */
  private handleAgentAck(agent: ConnectedAgentDevice, ack: AgentAckPayload): void {
    const pending = this.pendingJobRequests.get(ack.requestId);
    if (!pending) {
      logger.warn({
        event: "unmatched_agent_ack",
        requestId: ack.requestId,
        jobId: ack.jobId,
        stage: ack.stage,
      });
      return;
    }

    // Only the agent the job was dispatched to may acknowledge it.
    if (pending.agentId !== agent.agentId) {
      logger.warn({
        event: "unauthorized_agent_ack_rejected",
        requestId: ack.requestId,
        jobId: ack.jobId,
        expectedAgentId: pending.agentId,
        receivedAgentId: agent.agentId,
      });
      return;
    }

    if (ack.stage === "RECEIVED") {
      // The agent queued the job locally; from now on a disconnect means UNCERTAIN, not FAILED.
      pending.stage = "RECEIVED";
      return;
    }

    clearTimeout(pending.timeoutTimer);
    this.pendingJobRequests.delete(ack.requestId);

    switch (ack.stage) {
      case "PRINTED":
        pending.resolve({
          success: true,
          uncertain: false,
          bytesWritten: ack.bytesWritten || 0,
        });
        break;
      case "FAILED":
        pending.resolve({
          success: false,
          uncertain: false,
          error: ack.error || "Local printer socket write failed",
        });
        break;
      case "UNCERTAIN":
        pending.resolve({
          success: false,
          uncertain: true,
          error: ack.error || "UNCERTAIN_DELIVERY: Ambiguous hardware socket outcome reported by local agent",
        });
        break;
    }
  }

  /**
   * Handle health check result from agent.
   */
  private handleHealthCheckResult(agent: ConnectedAgentDevice, res: AgentHealthCheckResultPayload): void {
    const pending = this.pendingHealthRequests.get(res.requestId);
    if (!pending) return;

    if (pending.agentId !== agent.agentId) {
      logger.warn({
        event: "unauthorized_health_result_rejected",
        requestId: res.requestId,
        expectedAgentId: pending.agentId,
        receivedAgentId: agent.agentId,
      });
      return;
    }

    clearTimeout(pending.timeoutTimer);
    this.pendingHealthRequests.delete(res.requestId);

    pending.resolve({
      isOnline: res.isOnline,
      latencyMs: res.latencyMs,
      error: res.error,
    });
  }

  /**
   * Check if an active local agent is available to service a printer.
   */
  isAgentAvailableForPrinter(printer: Printer): boolean {
    if (printer.agentId) {
      return this.connectedAgents.has(printer.agentId);
    }
    return this.findPermittingAgent(printer) !== undefined;
  }

  /** A connected agent in the printer's tenant that permits it (an empty permitted set allows all). */
  private findPermittingAgent(printer: Printer): ConnectedAgentDevice | undefined {
    for (const agent of this.connectedAgents.values()) {
      if (
        agent.tenantId === printer.tenantId &&
        (agent.permittedPrinterIds.has(printer.id) || agent.permittedPrinterIds.size === 0)
      ) {
        return agent;
      }
    }
    return undefined;
  }

  /** The printer's assigned agent if it is connected, otherwise any permitting agent. */
  private resolveAgentForPrinter(printer: Printer): ConnectedAgentDevice | undefined {
    const assigned = printer.agentId ? this.connectedAgents.get(printer.agentId) : undefined;
    return assigned ?? this.findPermittingAgent(printer);
  }

  /**
   * Dispatch a print job frame to the local agent servicing this printer.
   * Resolves (never rejects) once the agent acknowledges, disconnects or times out.
   */
  async dispatchPrint(
    printer: Printer,
    data: Buffer | string,
    context?: PrintContext
  ): Promise<PrinterAdapterResult> {
    const rawBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");

    if (rawBuffer.length > MAX_PRINT_JOB_FRAME_BYTES) {
      return {
        success: false,
        uncertain: false,
        error: `Payload exceeds maximum allowable print frame size (${rawBuffer.length} > ${MAX_PRINT_JOB_FRAME_BYTES} bytes)`,
      };
    }

    const targetAgent = this.resolveAgentForPrinter(printer);
    if (!targetAgent) {
      return {
        success: false,
        uncertain: false,
        error: `AGENT_OFFLINE: No local print agent is currently connected for printer '${printer.name}' (${printer.id})`,
      };
    }

    // An assigned agentId may point at another tenant's agent.
    if (targetAgent.tenantId !== printer.tenantId) {
      return {
        success: false,
        uncertain: false,
        error: "SECURITY_VIOLATION: Cross-tenant printer dispatch rejected",
      };
    }

    const requestId = crypto.randomUUID();
    const jobId = context?.jobId || requestId;

    return new Promise<PrinterAdapterResult>((resolve) => {
      const timeoutTimer = setTimeout(() => {
        const pending = this.pendingJobRequests.get(requestId);
        if (!pending) return;

        this.pendingJobRequests.delete(requestId);
        if (pending.stage === "RECEIVED") {
          resolve({
            success: false,
            uncertain: true,
            error: `UNCERTAIN_DELIVERY: Local agent received job ${jobId} but printer write confirmation timed out`,
          });
        } else {
          resolve({
            success: false,
            uncertain: false,
            error: `AGENT_TIMEOUT: Local agent did not acknowledge print request within 10000ms`,
          });
        }
      }, 10000);

      this.pendingJobRequests.set(requestId, {
        requestId,
        jobId,
        printerId: printer.id,
        agentId: targetAgent.agentId,
        stage: "PENDING",
        timeoutTimer,
        resolve,
      });

      const frame: PrintRequestFrame = {
        type: "PRINT_REQUEST",
        requestId,
        jobId,
        jobType: context?.jobType || "PRINT_SLIP",
        printerId: printer.id,
        printerName: printer.name,
        printerHost: printer.ipAddress,
        printerPort: printer.port || 9100,
        paperWidthMm: printer.paperWidthMm || 80,
        isReprint: Boolean(context?.isReprint),
        payloadBase64: rawBuffer.toString("base64"),
        bytesLength: rawBuffer.length,
        timestamp: new Date().toISOString(),
      };

      this.sendFrame(targetAgent.socket, frame);
    });
  }

  /**
   * Dispatch a health check ping via the local agent.
   */
  async dispatchHealthCheck(printer: Printer): Promise<PrinterHealthResult> {
    const targetAgent = this.resolveAgentForPrinter(printer);
    if (!targetAgent) {
      return {
        isOnline: false,
        error: "Local print agent offline",
      };
    }

    const requestId = crypto.randomUUID();

    return new Promise<PrinterHealthResult>((resolve) => {
      const timeoutTimer = setTimeout(() => {
        this.pendingHealthRequests.delete(requestId);
        resolve({
          isOnline: false,
          error: "Health check timed out waiting for local agent",
        });
      }, 4000);

      this.pendingHealthRequests.set(requestId, {
        requestId,
        printerId: printer.id,
        agentId: targetAgent.agentId,
        timeoutTimer,
        resolve,
      });

      this.sendFrame(targetAgent.socket, {
        type: "HEALTH_CHECK_REQUEST",
        requestId,
        printerId: printer.id,
        host: printer.ipAddress,
        port: printer.port || 9100,
      });
    });
  }

  /** Serialize and write a JSON frame if the socket is open. */
  private sendFrame(socket: WebSocket, frame: AgentOutboundFrame): void {
    try {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(frame));
      }
    } catch (err) {
      logger.warn({ msg: "Failed to send frame to agent socket", err });
    }
  }

  /**
   * Broadcast agent online/offline transition over staff WebSocket.
   */
  private broadcastAgentStatus(agent: ConnectedAgentDevice, status: "CONNECTED" | "DISCONNECTED"): void {
    try {
      websocketService.broadcastEvent({
        tenantId: agent.tenantId,
        eventType: "PRINT_AGENT_STATUS",
        topic: "printers:agents",
        payload: {
          agentId: agent.agentId,
          deviceId: agent.deviceId,
          name: agent.name,
          status,
          remoteAddress: agent.remoteAddress,
          timestamp: new Date().toISOString(),
        },
      });
    } catch {}
  }

  /**
   * Graceful shutdown of gateway.
   */
  shutdown(): void {
    for (const agent of this.connectedAgents.values()) {
      closeQuietly(agent.socket, 1001, "SERVER_SHUTDOWN");
    }
    this.connectedAgents.clear();

    for (const req of this.pendingJobRequests.values()) {
      clearTimeout(req.timeoutTimer);
      req.resolve({
        success: false,
        uncertain: true,
        error: "SERVER_SHUTDOWN: Print gateway stopped during processing",
      });
    }
    this.pendingJobRequests.clear();
  }
}

export const printAgentGatewayService = new PrintAgentGatewayService();
