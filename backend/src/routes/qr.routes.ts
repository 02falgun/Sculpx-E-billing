import type { FastifyPluginAsync } from "fastify";
import { env } from "../config/env.js";
import { qrController } from "../controllers/qr.controller.js";

export const qrRoutes: FastifyPluginAsync = async (fastify) => {
  // 30 req/min per IP in production to prevent token brute-forcing; raised under test
  const publicQrRateLimit = {
    max: env.NODE_ENV === "test" ? 1000 : 30,
    timeWindow: 60000,
  };

  // Rate limit test endpoint with low threshold
  fastify.get(
    "/test-rate-limit-qr",
    { config: { rateLimit: { max: 2, timeWindow: 60000 } } },
    qrController.testRateLimit
  );

  // Public resolution of a table/room QR token for dining customers (no staff auth)
  fastify.get(
    "/qr-context/:token",
    { config: { rateLimit: publicQrRateLimit } },
    qrController.resolveQrContext
  );
};
