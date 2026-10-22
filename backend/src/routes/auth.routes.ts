import type { FastifyPluginAsync } from "fastify";
import { env } from "../config/env.js";
import { authenticate, requireRoles, requireTenantScope } from "../middleware/auth.js";
import { authController } from "../controllers/auth.controller.js";

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const effectiveLoginRateLimit = env.NODE_ENV === "test" ? 1000 : env.RATE_LIMIT_MAX;

  // Public login, rate limited to mitigate brute force credential attacks
  fastify.post(
    "/login",
    {
      config: {
        rateLimit: {
          max: effectiveLoginRateLimit,
          timeWindow: env.RATE_LIMIT_WINDOW_MS,
        },
      },
    },
    authController.login
  );

  fastify.get("/me", { preHandler: [authenticate] }, authController.me);
  fastify.post("/logout", { preHandler: [authenticate] }, authController.logout);

  // Role & tenant verification route for automated security tests
  fastify.get(
    "/test-admin-only",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN"), requireTenantScope] },
    authController.testAdminOnly
  );

  // Rate limit test endpoint to verify 429 RATE_LIMIT_EXCEEDED
  fastify.post(
    "/test-rate-limit",
    { config: { rateLimit: { max: 2, timeWindow: 60000 } } },
    authController.testRateLimit
  );
};
