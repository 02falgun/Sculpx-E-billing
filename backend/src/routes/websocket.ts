import type { FastifyPluginAsync } from "fastify";
import { websocketService } from "../services/websocket.service.js";

export const websocketRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /ws
   * Realtime WebSocket upgrade route for SCULPX E-Billing staff and guest clients.
   * Authenticates staff or QR guests and delivers events according to authorized topic subscriptions.
   */
  fastify.get("/ws", { websocket: true }, (socket, req) => {
    websocketService.handleConnection(socket, req);
  });

  /**
   * GET /ws/stats
   * Diagnostic statistics about connected WebSocket clients (Staff/Admin observability).
   */
  fastify.get("/ws/stats", async (req, reply) => {
    // Optional staff verification or health check observability
    const clientCount = websocketService.getClientCount();
    const clients = websocketService.getActiveClients();
    return {
      success: true,
      data: {
        activeConnections: clientCount,
        clients,
      },
    };
  });
};
