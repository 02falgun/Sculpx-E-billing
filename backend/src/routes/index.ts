import type { FastifyPluginAsync } from "fastify";
import { healthRoutes } from "./health.js";
import { authRoutes } from "./auth.js";
import { menuRoutes } from "./menu.js";

export const apiRoutes: FastifyPluginAsync = async (fastify) => {
  // Direct /api/health and /api/ready
  await fastify.register(healthRoutes);

  // Direct /api/auth endpoints (/api/auth/login, /api/auth/me, /api/auth/logout)
  await fastify.register(authRoutes, { prefix: "/auth" });

  // Direct /api/menu endpoints
  await fastify.register(menuRoutes, { prefix: "/menu" });

  // Mount under /v1 for versioned API contract (/api/v1/...)
  await fastify.register(
    async (v1) => {
      await v1.register(healthRoutes);
      await v1.register(authRoutes, { prefix: "/auth" });
      await v1.register(menuRoutes, { prefix: "/menu" });
    },
    { prefix: "/v1" }
  );
};
