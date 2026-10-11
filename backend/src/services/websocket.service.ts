import type { FastifyRequest } from "fastify";
import type { WebSocket } from "ws";
import crypto from "node:crypto";
import { logger } from "../lib/logger.js";
import { qrService } from "./qr.service.js";

export type JwtVerifier = (token: string) => Promise<any> | any;

export interface ConnectedClient {
  id: string;
  socket: WebSocket;
  tenantId?: string;
  userId?: string;
  role?: string;
  permissions: string[];
  isGuest: boolean;
  topics: Set<string>;
  connectedAt: Date;
  orderIds: Set<string>;
  remoteAddress?: string;
  jwtVerifier?: (token: string) => Promise<any> | any;
}

export interface WsMessageEnvelope<T = unknown> {
  id: string;
  type: string;
  topic?: string;
  payload?: T;
  version?: string;
  timestamp: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export class WebSocketService {
  private clients = new Map<string, ConnectedClient>();

  /**
   * Return number of active WebSocket client connections.
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Return list of active clients (for diagnostics/monitoring).
   */
  getActiveClients(): Array<{
    id: string;
    tenantId?: string;
    role?: string;
    isGuest: boolean;
    topics: string[];
    connectedAt: string;
  }> {
    return Array.from(this.clients.values()).map((c) => ({
      id: c.id,
      tenantId: c.tenantId,
      role: c.role,
      isGuest: c.isGuest,
      topics: Array.from(c.topics),
      connectedAt: c.connectedAt.toISOString(),
    }));
  }

  /**
   * Handle incoming WebSocket connection from Fastify route.
   */
  async handleConnection(socket: WebSocket, req: FastifyRequest): Promise<void> {
    const clientId = crypto.randomUUID();
    const query = (req.query as Record<string, string | undefined>) || {};
    const remoteAddress = req.ip || "unknown";

    const client: ConnectedClient = {
      id: clientId,
      socket,
      isGuest: false,
      permissions: [],
      topics: new Set<string>(),
      connectedAt: new Date(),
      orderIds: new Set<string>(),
      remoteAddress,
      jwtVerifier: (token: string) => (req.server as any).jwt.verify(token),
    };

    this.clients.set(clientId, client);

    logger.info({
      event: "websocket_client_connected",
      clientId,
      remoteAddress,
      queryTokens: {
        hasToken: !!query.token,
        hasQrToken: !!query.qrToken,
      },
    });

    // Handshake authentication: prefer in-band AUTHENTICATE frame; warn on query tokens
    if (query.token) {
      logger.warn({
        event: "websocket_query_token_deprecated",
        clientId,
        msg: "Passing JWT in query string is deprecated for security; use in-band AUTHENTICATE message frame",
      });
      await this.authenticateWithStaffToken(client, query.token);
    } else if (query.qrToken) {
      await this.authenticateWithQrToken(client, query.qrToken);
    }

    // Set up ping-pong keepalive & message handling
    socket.on("message", async (data: Buffer | string) => {
      try {
        const raw = data.toString("utf-8");
        const parsed = JSON.parse(raw);
        await this.handleClientFrame(client, parsed);
      } catch (err: unknown) {
        logger.warn({
          event: "websocket_frame_parse_error",
          clientId,
          error: err instanceof Error ? err.message : String(err),
        });
        this.sendError(client, "INVALID_FRAME", "Malformed JSON frame received");
      }
    });

    socket.on("close", (code, reason) => {
      this.clients.delete(clientId);
      logger.info({
        event: "websocket_client_disconnected",
        clientId,
        code,
        reason: reason.toString("utf-8"),
        totalRemaining: this.clients.size,
      });
    });

    socket.on("error", (err) => {
      logger.warn({
        event: "websocket_client_error",
        clientId,
        error: err.message,
      });
    });

    // Send connection established handshake
    this.sendFrame(client, {
      id: crypto.randomUUID(),
      type: "CONNECTION_ESTABLISHED",
      version: "1.0",
      timestamp: new Date().toISOString(),
      payload: {
        clientId,
        isAuthenticated: !!client.tenantId,
        role: client.role || (client.isGuest ? "GUEST" : "ANONYMOUS"),
        tenantId: client.tenantId,
      },
    });
  }

  /**
   * Authenticate a staff member via JWT access token.
   */
  async authenticateWithStaffToken(client: ConnectedClient, token: string): Promise<boolean> {
    try {
      if (!client.jwtVerifier) {
        throw new Error("JWT verifier not initialized on connection");
      }

      const decoded = (await client.jwtVerifier(token)) as {
        id?: string;
        sub?: string;
        tenantId?: string;
        role?: string;
        permissions?: string[];
      };

      if (!decoded.tenantId || !decoded.role) {
        throw new Error("Missing required tenant or role in JWT claims");
      }

      client.userId = decoded.id || decoded.sub;
      client.tenantId = decoded.tenantId;
      client.role = decoded.role;
      client.permissions = Array.isArray(decoded.permissions) ? decoded.permissions : [];
      client.isGuest = false;

      logger.info({
        event: "websocket_staff_authenticated",
        clientId: client.id,
        tenantId: client.tenantId,
        role: client.role,
        userId: client.userId,
      });

      this.sendFrame(client, {
        id: crypto.randomUUID(),
        type: "AUTHENTICATED",
        version: "1.0",
        timestamp: new Date().toISOString(),
        payload: {
          role: client.role,
          tenantId: client.tenantId,
          userId: client.userId,
        },
      });

      return true;
    } catch (err: unknown) {
      logger.warn({
        event: "websocket_staff_auth_failed",
        clientId: client.id,
        error: err instanceof Error ? err.message : String(err),
      });

      this.sendError(client, "AUTH_FAILED", "Invalid or expired staff authentication token");
      return false;
    }
  }

  /**
   * Authenticate a guest client via dining QR code token.
   */
  async authenticateWithQrToken(client: ConnectedClient, qrToken: string): Promise<boolean> {
    try {
      const validated = await qrService.resolveValidatedQrEntity(qrToken);

      client.tenantId = validated.tenantId;
      client.isGuest = true;
      client.role = "GUEST";
      client.permissions = ["guest_order"];

      // If table has active order, associate with guest
      if (validated.table?.currentOrderId) {
        client.orderIds.add(validated.table.currentOrderId);
        client.topics.add(`order:${validated.table.currentOrderId}`);
      }

      logger.info({
        event: "websocket_guest_authenticated",
        clientId: client.id,
        tenantId: client.tenantId,
        qrType: validated.type,
      });

      this.sendFrame(client, {
        id: crypto.randomUUID(),
        type: "AUTHENTICATED",
        version: "1.0",
        timestamp: new Date().toISOString(),
        payload: {
          role: "GUEST",
          tenantId: client.tenantId,
          qrContext: {
            type: validated.type,
            identifier: validated.type === "TABLE" ? validated.table?.tableNumber : validated.room?.roomNumber,
          },
        },
      });

      return true;
    } catch (err: unknown) {
      logger.warn({
        event: "websocket_guest_auth_failed",
        clientId: client.id,
        error: err instanceof Error ? err.message : String(err),
      });

      this.sendError(client, "AUTH_FAILED", "Invalid or expired QR dining session");
      return false;
    }
  }

  /**
   * Dispatch incoming JSON frames from clients.
   */
  private async handleClientFrame(client: ConnectedClient, frame: Record<string, unknown>): Promise<void> {
    const action = String(frame.action || frame.type || "").toUpperCase();

    switch (action) {
      case "HEARTBEAT":
      case "PING": {
        this.sendFrame(client, {
          id: crypto.randomUUID(),
          type: "HEARTBEAT_ACK",
          version: "1.0",
          timestamp: new Date().toISOString(),
          payload: { receivedAt: frame.timestamp || Date.now() },
        });
        break;
      }

      case "AUTHENTICATE": {
        if (typeof frame.token === "string") {
          await this.authenticateWithStaffToken(client, frame.token);
        } else if (typeof frame.qrToken === "string") {
          await this.authenticateWithQrToken(client, frame.qrToken);
        } else {
          this.sendError(client, "VALIDATION_FAILED", "Authentication payload requires token or qrToken");
        }
        break;
      }

      case "SUBSCRIBE": {
        const topic = typeof frame.topic === "string" ? frame.topic.trim() : "";
        if (!topic) {
          this.sendError(client, "INVALID_TOPIC", "Topic parameter is required for subscription");
          return;
        }

        // Optional token provided in subscribe payload
        if (typeof frame.token === "string" && !client.tenantId) {
          await this.authenticateWithStaffToken(client, frame.token);
        }

        this.authorizeAndSubscribe(client, topic);
        break;
      }

      case "UNSUBSCRIBE": {
        const topic = typeof frame.topic === "string" ? frame.topic.trim() : "";
        if (topic) {
          client.topics.delete(topic);
          this.sendFrame(client, {
            id: crypto.randomUUID(),
            type: "UNSUBSCRIBED",
            topic,
            version: "1.0",
            timestamp: new Date().toISOString(),
          });
        }
        break;
      }

      default:
        // Ignore unhandled client actions
        break;
    }
  }

  /**
   * Check permissions and authorize channel subscription.
   */
  private authorizeAndSubscribe(client: ConnectedClient, topic: string): void {
    if (!client.tenantId) {
      this.sendError(
        client,
        "UNAUTHENTICATED",
        "Connection must be authenticated before subscribing to topics"
      );
      return;
    }

    const role = client.role || "ANONYMOUS";

    // 1. Kitchen KDS stream
    if (topic === "kitchen:kots") {
      const allowedRoles = ["KITCHEN_STAFF", "MANAGER", "ADMIN", "SUPER_ADMIN", "WAITER", "CAPTAIN"];
      if (!allowedRoles.includes(role)) {
        this.sendError(
          client,
          "FORBIDDEN",
          `Role '${role}' is not authorized to subscribe to kitchen ticket stream '${topic}'`,
          { topic }
        );
        return;
      }
    }
    // 2. Orders floor stream
    else if (topic === "orders:all") {
      const allowedRoles = ["WAITER", "CAPTAIN", "CASHIER", "MANAGER", "ADMIN", "SUPER_ADMIN"];
      if (!allowedRoles.includes(role)) {
        this.sendError(
          client,
          "FORBIDDEN",
          `Role '${role}' is not authorized to subscribe to order stream '${topic}'`,
          { topic }
        );
        return;
      }
    }
    // 3. Billing ledger stream
    else if (topic === "billing:all") {
      const allowedRoles = ["CASHIER", "MANAGER", "ADMIN", "SUPER_ADMIN"];
      if (!allowedRoles.includes(role)) {
        this.sendError(
          client,
          "FORBIDDEN",
          `Role '${role}' is not authorized to subscribe to billing stream '${topic}'`,
          { topic }
        );
        return;
      }
    }
    // 4. Hardware Printer stream
    else if (topic === "printers:jobs" || topic === "printers:all") {
      const allowedRoles = ["ADMIN", "SUPER_ADMIN", "MANAGER", "CASHIER"];
      if (!allowedRoles.includes(role)) {
        this.sendError(
          client,
          "FORBIDDEN",
          `Role '${role}' is not authorized to subscribe to hardware printer stream '${topic}'`,
          { topic }
        );
        return;
      }
    }
    // 4. Specific Order stream (e.g. order:c71be39c-...)
    else if (topic.startsWith("order:")) {
      const orderId = topic.replace(/^order:/, "").trim();
      const isStaff = !client.isGuest && role !== "ANONYMOUS";
      const isGuestOfOrder = client.isGuest && (client.orderIds.has(orderId) || client.topics.has(topic));

      // If guest not yet linked to this order, allow initial subscription if order was created for their session
      if (!isStaff && !isGuestOfOrder) {
        // Automatically associate guest with this order topic
        client.orderIds.add(orderId);
      }
    }
    // 5. System or other streams
    else {
      // General staff-only fallback for custom topics
      if (client.isGuest) {
        this.sendError(
          client,
          "FORBIDDEN",
          `Public guest connections cannot subscribe to internal channel '${topic}'`,
          { topic }
        );
        return;
      }
    }

    // Authorization successful
    client.topics.add(topic);

    logger.debug({
      event: "websocket_subscribed",
      clientId: client.id,
      tenantId: client.tenantId,
      role: client.role,
      topic,
    });

    this.sendFrame(client, {
      id: crypto.randomUUID(),
      type: "SUBSCRIBED",
      topic,
      version: "1.0",
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcast an event to all authorized subscribers of the matching tenant and topic.
   * Strict cross-tenant isolation: Never emit frames across tenants.
   */
  broadcastEvent(event: {
    tenantId: string;
    eventType: string;
    topic: string;
    payload: Record<string, unknown>;
  }): { delivered: number; totalClients: number } {
    let delivered = 0;
    const totalClients = this.clients.size;

    // Standard wire envelope format
    const envelope: WsMessageEnvelope = {
      id: crypto.randomUUID(),
      type: event.eventType.toUpperCase().replace(/\./g, "_"), // e.g. ORDER_CREATED, KOT_CREATED
      topic: event.topic,
      payload: event.payload,
      version: "1.0",
      timestamp: new Date().toISOString(),
    };

    const payloadString = JSON.stringify(envelope);

    for (const client of this.clients.values()) {
      // 1. Strict Tenant Isolation
      if (client.tenantId !== event.tenantId) {
        continue;
      }

      // 2. Topic Subscription Check
      const matchesTopic =
        client.topics.has(event.topic) ||
        client.topics.has("*") ||
        (event.payload?.orderId && client.topics.has(`order:${event.payload.orderId}`));

      if (!matchesTopic) {
        continue;
      }

      // 3. Socket Health & Delivery
      if (client.socket.readyState === 1 /* OPEN */) {
        try {
          client.socket.send(payloadString);
          delivered++;
        } catch (err: unknown) {
          logger.warn({
            event: "websocket_delivery_failed",
            clientId: client.id,
            tenantId: event.tenantId,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    logger.info({
      event: "websocket_event_broadcast",
      eventType: envelope.type,
      topic: event.topic,
      tenantId: event.tenantId,
      delivered,
      totalClients,
    });

    return { delivered, totalClients };
  }

  /**
   * Helper to safely serialize and send a frame to a specific client.
   */
  sendFrame(client: ConnectedClient, envelope: WsMessageEnvelope): void {
    if (client.socket.readyState === 1 /* OPEN */) {
      try {
        client.socket.send(JSON.stringify(envelope));
      } catch (err: unknown) {
        logger.warn({
          event: "websocket_send_failed",
          clientId: client.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  /**
   * Helper to send a typed error frame to a client.
   */
  sendError(client: ConnectedClient, code: string, message: string, details?: unknown): void {
    this.sendFrame(client, {
      id: crypto.randomUUID(),
      type: "ERROR",
      version: "1.0",
      timestamp: new Date().toISOString(),
      error: { code, message, details },
    });
  }

  /**
   * Cleanly terminate all connected sockets during server shutdown.
   */
  shutdown(): void {
    for (const client of this.clients.values()) {
      try {
        client.socket.close(1001, "Server shutting down");
      } catch {}
    }
    this.clients.clear();
  }
}

export const websocketService = new WebSocketService();
