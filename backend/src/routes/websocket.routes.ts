import type { FastifyPluginAsync } from "fastify";
import { websocketService } from "../services/websocket.service.js";
import { printAgentGatewayService } from "../services/print-agent-gateway.service.js";

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
   * GET /ws/print-agent
   * Dedicated authenticated WebSocket endpoint for Local Print Agent daemon.
   * Enforces independent device credentials (never staff tokens) and routes local ESC/POS print jobs.
   */
  fastify.get("/ws/print-agent", { websocket: true }, (socket, req) => {
    printAgentGatewayService.handleConnection(socket, req);
  });

  /**
   * GET /ws/stats
   * Diagnostic statistics about connected WebSocket clients (Staff/Admin observability).
   */
  fastify.get("/ws/stats", async () => {
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
