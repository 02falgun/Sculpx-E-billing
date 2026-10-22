import type { FastifyPluginAsync } from "fastify";
import { healthController } from "../controllers/health.controller.js";

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  // Liveness: service is alive and accepting traffic
  fastify.get("/health", healthController.liveness);

  // Readiness: database is reachable and accepting queries
  fastify.get("/ready", healthController.readiness);
};
