import type { FastifyReply, FastifyRequest } from "fastify";
import { formatErrorResponse, sendSuccess } from "../lib/response.js";
import { ErrorCode } from "../constants/error-codes.js";
import { healthService } from "../services/health.service.js";

export const healthController = {
  async liveness(request: FastifyRequest, reply: FastifyReply) {
    return sendSuccess(request, reply, healthService.getLiveness());
  },

  async readiness(request: FastifyRequest, reply: FastifyReply) {
    const dbHealth = await healthService.checkReadiness();

    if (!dbHealth.connected) {
      request.log.warn({ dbHealth }, "Database readiness check failed");
      return reply.status(503).send(
        formatErrorResponse(
          ErrorCode.DATABASE_UNAVAILABLE,
          "Database connection is unavailable or not accepting queries",
          { error: dbHealth.error, timestamp: dbHealth.timestamp }
        )
      );
    }

    return sendSuccess(request, reply, {
      status: "READY",
      database: "CONNECTED",
      latencyMs: dbHealth.latencyMs,
      timestamp: dbHealth.timestamp,
    });
  },
};
