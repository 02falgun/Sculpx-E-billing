import crypto from "node:crypto";
import type { FastifyRequest } from "fastify";
import type { WebSocket } from "ws";
import type { Printer } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { websocketService } from "./websocket.service.js";
import {
  MAX_PRINT_JOB_FRAME_BYTES,
  MAX_CONTROL_FRAME_BYTES,
  agentInboundFrameSchema,
  type AgentAckPayload,
  type AgentHealthCheckResultPayload,
} from "../schemas/print-agent.schema.js";
import type { PrinterAdapterResult, PrinterHealthResult } from "./printer-adapters/types.js";

export interface ConnectedAgentDevice {
  agentId: string;
  deviceId: string;
  tenantId: string;
  name: string;
  socket: WebSocket;
  remoteAddress: string;
  connectedAt: Date;
  lastHeartbeatAt: Date;
  version?: string;
  permittedPrinterIds: Set<string>;
}

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

export class PrintAgentGatewayService {
  private connectedAgents = new Map<string, ConnectedAgentDevice>(); // Key: agentId
  private pendingJobRequests = new Map<string, PendingJobRequest>(); // Key: requestId
  private pendingHealthRequests = new Map<string, PendingHealthRequest>(); // Key: requestId

  /**
   * Register a new print agent device for a tenant.
   * Generates a cryptographically secure API key and stores its SHA-256 hash.
   * Returns the plain API key ONLY once during registration.
   */
  async registerAgent(
    tenantId: string,
    input: {
      name: string;
      deviceId: string;
      permittedPrinterIds?: string[];
      metadata?: Record<string, unknown>;
    }
  ): Promise<{ agent: any; apiKey: string }> {
    const existing = await prisma.printAgent.findUnique({
      where: { deviceId: input.deviceId },
    });

    if (existing) {
      throw new AppError(
        `Device ID '${input.deviceId}' is already registered`,
        409,
        "DEVICE_ALREADY_EXISTS"
      );
    }

    // Verify permittedPrinterIds belong to tenant if supplied
    if (input.permittedPrinterIds && input.permittedPrinterIds.length > 0) {
      const printers = await prisma.printer.findMany({
        where: {
          tenantId,
          id: { in: input.permittedPrinterIds },
        },
      });

      if (printers.length !== input.permittedPrinterIds.length) {
        throw new AppError(
          "One or more permitted printers do not exist or belong to another tenant",
          400,
          "INVALID_PRINTER_ASSIGNMENT"
        );
      }
    }

    // Generate random API key with secure prefix
    const plainApiKey = `sculpx_ag_${crypto.randomBytes(24).toString("hex")}`;
    const apiKeyHash = crypto.createHash("sha256").update(plainApiKey).digest("hex");

    const agent = await prisma.printAgent.create({
      data: {
        tenantId,
        name: input.name.trim(),
        deviceId: input.deviceId.trim(),
        apiKeyHash,
        status: "ACTIVE",
        permittedPrinterIds: input.permittedPrinterIds || [],
        metadata: input.metadata as any,
      },
    });

    // If printers assigned, link agentId on Printer records
    if (input.permittedPrinterIds && input.permittedPrinterIds.length > 0) {
      await prisma.printer.updateMany({
        where: { id: { in: input.permittedPrinterIds } },
        data: { agentId: agent.id, connectionType: "LOCAL_AGENT" },
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
    const agents = await prisma.printAgent.findMany({
      where: { tenantId },
      include: {
        printers: {
          select: {
            id: true,
            name: true,
            type: true,
            station: true,
            isOnline: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

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
    const agent = await prisma.printAgent.findUnique({
      where: { id: agentId },
      include: {
        printers: true,
      },
    });

    if (!agent || agent.tenantId !== tenantId) {
      throw new AppError("Print agent not found", 404, "AGENT_NOT_FOUND");
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

    const plainApiKey = `sculpx_ag_${crypto.randomBytes(24).toString("hex")}`;
    const apiKeyHash = crypto.createHash("sha256").update(plainApiKey).digest("hex");

    await prisma.printAgent.update({
      where: { id: agent.id },
      data: { apiKeyHash },
    });

    // Disconnect active socket if connected
    const active = this.connectedAgents.get(agent.id);
    if (active) {
      try {
        active.socket.close(4001, "API_KEY_ROTATED: Please reconnect with new credential");
      } catch {}
      this.handleAgentDisconnect(agent.id, 4001, "API_KEY_ROTATED");
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

    await prisma.printAgent.update({
      where: { id: agent.id },
      data: {
        status: "REVOKED",
        isOnline: false,
        lastDisconnectedAt: new Date(),
      },
    });

    // Disconnect active socket
    const active = this.connectedAgents.get(agent.id);
    if (active) {
      try {
        active.socket.close(4003, "AGENT_REVOKED: Device authorization has been revoked");
      } catch {}
      this.handleAgentDisconnect(agent.id, 4003, "AGENT_REVOKED");
    }

    // Mark assigned printers offline
    await prisma.printer.updateMany({
      where: { agentId: agent.id },
      data: { isOnline: false },
    });

    logger.warn({
      event: "print_agent_revoked",
      agentId: agent.id,
      tenantId,
    });
  }

  /**
   * Bind or unbind permitted printer IDs for an agent.
   */
  async bindPrinters(tenantId: string, agentId: string, printerIds: string[]): Promise<any> {
    const agent = await this.getAgentById(tenantId, agentId);

    // Verify all printers belong to tenant
    if (printerIds.length > 0) {
      const count = await prisma.printer.count({
        where: { tenantId, id: { in: printerIds } },
      });
      if (count !== printerIds.length) {
        throw new AppError(
          "One or more printer IDs do not belong to tenant",
          400,
          "INVALID_PRINTERS"
        );
      }
    }

    // Clear previous agentId associations for this agent
    await prisma.printer.updateMany({
      where: { agentId: agent.id },
      data: { agentId: null },
    });

    // Set agentId on newly bound printers
    if (printerIds.length > 0) {
      await prisma.printer.updateMany({
        where: { id: { in: printerIds } },
        data: { agentId: agent.id, connectionType: "LOCAL_AGENT" },
      });
    }

    const updated = await prisma.printAgent.update({
      where: { id: agent.id },
      data: { permittedPrinterIds: printerIds },
      include: { printers: true },
    });

    // Update in-memory connected agent cache if active
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
   * Handle incoming WebSocket connection from Local Print Agent.
   * Path: /ws/print-agent
   */
  async handleConnection(socket: WebSocket, req: FastifyRequest): Promise<void> {
    const remoteAddress = req.ip || "unknown";
    let authenticatedAgent: ConnectedAgentDevice | null = null;
    let handshakeTimeoutTimer: NodeJS.Timeout | null = null;

    // Check if credentials provided via HTTP upgrade headers
    const headerDeviceId = (req.headers["x-agent-id"] || req.headers["x-device-id"]) as string | undefined;
    const headerApiKey = (req.headers["x-agent-key"] || req.headers["x-api-key"]) as string | undefined;

    const performAuth = async (deviceId: string, apiKey: string): Promise<boolean> => {
      try {
        const agent = await prisma.printAgent.findUnique({
          where: { deviceId },
          include: { printers: true },
        });

        if (!agent) {
          logger.warn({ event: "agent_auth_failed", reason: "DEVICE_NOT_FOUND", deviceId });
          return false;
        }

        if (agent.status !== "ACTIVE") {
          logger.warn({ event: "agent_auth_failed", reason: `AGENT_${agent.status}`, deviceId });
          return false;
        }

        // Verify API key hash with constant-time equality
        const incomingHash = crypto.createHash("sha256").update(apiKey).digest("hex");
        const storedHash = agent.apiKeyHash;

        if (
          incomingHash.length !== storedHash.length ||
          !crypto.timingSafeEqual(Buffer.from(incomingHash), Buffer.from(storedHash))
        ) {
          logger.warn({ event: "agent_auth_failed", reason: "INVALID_KEY_HASH", deviceId });
          return false;
        }

        // Close any existing connected socket for this agent (split-brain protection)
        const existing = this.connectedAgents.get(agent.id);
        if (existing && existing.socket !== socket) {
          try {
            existing.socket.close(4009, "NEW_CONNECTION_REPLACED");
          } catch {}
          this.connectedAgents.delete(agent.id);
        }

        // Construct permitted printers set (include explicitly bound printers and array IDs)
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

        // Update DB agent status
        await prisma.printAgent.update({
          where: { id: agent.id },
          data: {
            isOnline: true,
            lastConnectedAt: new Date(),
            lastHeartbeatAt: new Date(),
            ipAddress: remoteAddress,
          },
        });

        // Mark assigned printers as online
        if (permitted.size > 0) {
          await prisma.printer.updateMany({
            where: { id: { in: Array.from(permitted) } },
            data: { isOnline: true },
          });
        }

        // Clear handshake timeout
        if (handshakeTimeoutTimer) {
          clearTimeout(handshakeTimeoutTimer);
          handshakeTimeoutTimer = null;
        }

        // Send AGENT_WELCOME frame
        this.sendFrame(socket, {
          type: "AGENT_WELCOME",
          agentId: agent.id,
          tenantId: agent.tenantId,
          heartbeatIntervalMs: 15000,
          maxPayloadBytes: MAX_PRINT_JOB_FRAME_BYTES,
          permittedPrinterIds: Array.from(permitted),
        });

        // Broadcast status update to staff WebSocket topic
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

    // Attempt immediate header auth if present
    if (headerDeviceId && headerApiKey) {
      await performAuth(headerDeviceId, headerApiKey);
    } else {
      // Allow 5000ms window for in-band AGENT_HELLO frame
      handshakeTimeoutTimer = setTimeout(() => {
        if (!authenticatedAgent) {
          logger.warn({ event: "agent_handshake_timeout", remoteAddress });
          try {
            socket.close(4008, "HANDSHAKE_TIMEOUT");
          } catch {}
        }
      }, 5000);
    }

    socket.on("message", async (raw: Buffer | string) => {
      try {
        const byteLength = Buffer.isBuffer(raw) ? raw.length : Buffer.byteLength(raw, "utf8");

        // Enforce maximum frame size: max 64 KB for any frame
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

        const parsed = JSON.parse(raw.toString("utf8"));

        // If unauthenticated, only AGENT_HELLO is accepted
        if (!authenticatedAgent) {
          if (parsed.type === "AGENT_HELLO" && parsed.deviceId && parsed.apiKey) {
            const ok = await performAuth(parsed.deviceId, parsed.apiKey);
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

        // Validate message with Zod schema
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

        // Process validated frame
        switch (frame.type) {
          case "AGENT_PING": {
            authenticatedAgent.lastHeartbeatAt = new Date();
            this.sendFrame(socket, {
              type: "AGENT_PONG",
              timestamp: new Date().toISOString(),
            });
            break;
          }

          case "AGENT_ACK": {
            this.handleAgentAck(authenticatedAgent, frame);
            break;
          }

          case "HEALTH_CHECK_RESULT": {
            this.handleHealthCheckResult(authenticatedAgent, frame);
            break;
          }

          default:
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
        this.handleAgentDisconnect(authenticatedAgent.agentId, code, reason.toString("utf8"));
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
   * Handle agent disconnect: clean up memory state, fail in-flight requests, and update DB.
   */
  private async handleAgentDisconnect(agentId: string, code: number, reason: string): Promise<void> {
    const agent = this.connectedAgents.get(agentId);
    this.connectedAgents.delete(agentId);

    if (agent) {
      logger.info({
        event: "print_agent_disconnected",
        agentId,
        deviceId: agent.deviceId,
        code,
        reason,
      });

      this.broadcastAgentStatus(agent, "DISCONNECTED");

      // Mark agent offline in DB
      try {
        await prisma.printAgent.update({
          where: { id: agentId },
          data: {
            isOnline: false,
            lastDisconnectedAt: new Date(),
          },
        });

        // Mark bound printers offline
        if (agent.permittedPrinterIds.size > 0) {
          await prisma.printer.updateMany({
            where: { id: { in: Array.from(agent.permittedPrinterIds) } },
            data: { isOnline: false },
          });
        }
      } catch (err) {
        logger.warn({ msg: "Failed to persist agent offline status", err });
      }

      // Reject all pending job requests for this agent with appropriate uncertainty
      for (const [requestId, req] of this.pendingJobRequests.entries()) {
        if (agent.permittedPrinterIds.has(req.printerId)) {
          clearTimeout(req.timeoutTimer);
          this.pendingJobRequests.delete(requestId);

          if (req.stage === "RECEIVED") {
            // Agent already received bytes; disconnecting during write is UNCERTAIN
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
      }

      // Reject pending health checks
      for (const [requestId, req] of this.pendingHealthRequests.entries()) {
        if (agent.permittedPrinterIds.has(req.printerId)) {
          clearTimeout(req.timeoutTimer);
          this.pendingHealthRequests.delete(requestId);
          req.resolve({
            isOnline: false,
            error: "Local print agent disconnected during probe",
          });
        }
      }
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

    // Authorization verification: only the exact agent dispatched to can acknowledge
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

    switch (ack.stage) {
      case "RECEIVED": {
        // Agent safely queued job into local memory; mark stage to guard against disconnect
        pending.stage = "RECEIVED";
        break;
      }

      case "PRINTED": {
        clearTimeout(pending.timeoutTimer);
        this.pendingJobRequests.delete(ack.requestId);
        pending.resolve({
          success: true,
          uncertain: false,
          bytesWritten: ack.bytesWritten || 0,
        });
        break;
      }

      case "FAILED": {
        clearTimeout(pending.timeoutTimer);
        this.pendingJobRequests.delete(ack.requestId);
        pending.resolve({
          success: false,
          uncertain: false,
          error: ack.error || "Local printer socket write failed",
        });
        break;
      }

      case "UNCERTAIN": {
        clearTimeout(pending.timeoutTimer);
        this.pendingJobRequests.delete(ack.requestId);
        pending.resolve({
          success: false,
          uncertain: true,
          error: ack.error || "UNCERTAIN_DELIVERY: Ambiguous hardware socket outcome reported by local agent",
        });
        break;
      }
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

    // Check if any agent for this tenant has permitted this printer
    for (const agent of this.connectedAgents.values()) {
      if (agent.tenantId === printer.tenantId && (agent.permittedPrinterIds.has(printer.id) || agent.permittedPrinterIds.size === 0)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Dispatch a print job frame to the local agent servicing this printer.
   * Enforces 64 KB max payload size and non-blocking promise resolution.
   */
  async dispatchPrint(
    printer: Printer,
    data: Buffer | string,
    context?: { jobId?: string; jobType?: string; isReprint?: boolean }
  ): Promise<PrinterAdapterResult> {
    const rawBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, "utf8");

    if (rawBuffer.length > MAX_PRINT_JOB_FRAME_BYTES) {
      return {
        success: false,
        uncertain: false,
        error: `Payload exceeds maximum allowable print frame size (${rawBuffer.length} > ${MAX_PRINT_JOB_FRAME_BYTES} bytes)`,
      };
    }

    // Find active agent for this printer
    let targetAgent: ConnectedAgentDevice | undefined;

    if (printer.agentId) {
      targetAgent = this.connectedAgents.get(printer.agentId);
    }

    if (!targetAgent) {
      // Find active agent in same tenant with printer in permitted set or default
      for (const agent of this.connectedAgents.values()) {
        if (agent.tenantId === printer.tenantId && (agent.permittedPrinterIds.has(printer.id) || agent.permittedPrinterIds.size === 0)) {
          targetAgent = agent;
          break;
        }
      }
    }

    if (!targetAgent) {
      return {
        success: false,
        uncertain: false,
        error: `AGENT_OFFLINE: No local print agent is currently connected for printer '${printer.name}' (${printer.id})`,
      };
    }

    // Verify tenant boundary
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
      // 10-second timeout for agent response
      const timeoutTimer = setTimeout(() => {
        const pending = this.pendingJobRequests.get(requestId);
        if (pending) {
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

      // Transmit PRINT_REQUEST frame
      const frame = {
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
    let targetAgent: ConnectedAgentDevice | undefined;

    if (printer.agentId) {
      targetAgent = this.connectedAgents.get(printer.agentId);
    }

    if (!targetAgent) {
      for (const agent of this.connectedAgents.values()) {
        if (agent.tenantId === printer.tenantId && (agent.permittedPrinterIds.has(printer.id) || agent.permittedPrinterIds.size === 0)) {
          targetAgent = agent;
          break;
        }
      }
    }

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

  /**
   * Helper to serialize and write JSON frame to agent socket.
   */
  private sendFrame(socket: WebSocket, data: Record<string, unknown>): void {
    try {
      if (socket.readyState === 1 /* OPEN */) {
        socket.send(JSON.stringify(data));
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
    for (const [agentId, agent] of this.connectedAgents.entries()) {
      try {
        agent.socket.close(1001, "SERVER_SHUTDOWN");
      } catch {}
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
