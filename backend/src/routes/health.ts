import type { FastifyPluginAsync } from "fastify";
import { checkDatabaseHealth } from "../lib/prisma.js";
import { formatSuccessResponse, formatErrorResponse } from "../lib/errors.js";

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Liveness check: service is alive and accepting traffic
  fastify.get("/health", async (request, reply) => {
    const data = {
      status: "HEALTHY",
      service: "sculpx-ebilling-backend",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };

    return reply.status(200).send(formatSuccessResponse(data, request));
  });

  // Readiness check: database is reachable and accepting queries
  fastify.get("/ready", async (request, reply) => {
    const dbHealth = await checkDatabaseHealth();

    if (!dbHealth.connected) {
      request.log.warn({ dbHealth }, "Database readiness check failed");
      return reply.status(503).send(
        formatErrorResponse(
          "DATABASE_UNAVAILABLE",
          "Database connection is unavailable or not accepting queries",
          {
            error: dbHealth.error,
            timestamp: dbHealth.timestamp,
          }
        )
      );
    }

    const data = {
      status: "READY",
      database: "CONNECTED",
      latencyMs: dbHealth.latencyMs,
      timestamp: dbHealth.timestamp,
    };

    return reply.status(200).send(formatSuccessResponse(data, request));
  });
};
