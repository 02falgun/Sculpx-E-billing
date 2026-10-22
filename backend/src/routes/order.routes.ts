import type { FastifyPluginAsync } from "fastify";
import { env } from "../config/env.js";
import { orderController } from "../controllers/order.controller.js";

export const orderRoutes: FastifyPluginAsync = async (fastify) => {
  // Per-IP limits, relaxed in the test environment
  const cartValidationRateLimit = {
    max: env.NODE_ENV === "test" ? 1000 : 60,
    timeWindow: 60000,
  };
  const orderCreationRateLimit = {
    max: env.NODE_ENV === "test" ? 1000 : 30,
    timeWindow: 60000,
  };

  // Dedicated rate limit test endpoints (max: 2)
  fastify.post(
    "/test-rate-limit-validate",
    { config: { rateLimit: { max: 2, timeWindow: 60000 } } },
    orderController.testRateLimitValidate
  );
  fastify.post(
    "/test-rate-limit-order",
    { config: { rateLimit: { max: 2, timeWindow: 60000 } } },
    orderController.testRateLimitOrder
  );

  // Public: pre-checkout cart validation and QR order creation
  fastify.post("/validate", { config: { rateLimit: cartValidationRateLimit } }, orderController.validateCart);
  fastify.post("/", { config: { rateLimit: orderCreationRateLimit } }, orderController.createOrder);

  // Optional staff auth (guests may track orders / list via x-qr-token)
  fastify.get("/:id", orderController.getOrder);
  fastify.get("/", orderController.listOrders);
  fastify.patch("/:id/status", orderController.updateStatus);
  fastify.post("/:id/cancel", orderController.cancelOrder);
};
