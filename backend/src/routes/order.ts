import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { formatSuccessResponse, formatErrorResponse } from "../lib/errors.js";
import { cartService } from "../services/cart.service.js";
import { orderService } from "../services/order.service.js";
import { validateCartRequestSchema, type ValidateCartRequest } from "../schemas/cart.schema.js";
import {
  createOrderRequestSchema,
  orderHeadersSchema,
  type CreateOrderRequest,
} from "../schemas/order.schema.js";
import { env } from "../config/env.js";

export const orderRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Rate limiting for pre-checkout cart validation:
   * Defaults to 60 requests per minute per IP in production.
   * Relaxed in test environment.
   */
  const cartValidationRateLimit = {
    max: env.NODE_ENV === "test" ? 1000 : 60,
    timeWindow: 60000,
  };

  /**
   * Rate limiting for order creation:
   * Defaults to 30 requests per minute per IP in production to prevent spamming.
   * Relaxed in test environment.
   */
  const orderCreationRateLimit = {
    max: env.NODE_ENV === "test" ? 1000 : 30,
    timeWindow: 60000,
  };

  /**
   * Dedicated rate limit test endpoint for cart validation (max: 2).
   */
  fastify.post(
    "/test-rate-limit-validate",
    {
      config: {
        rateLimit: {
          max: 2,
          timeWindow: 60000,
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      return formatSuccessResponse({ status: "rate_limit_active" }, req);
    }
  );

  /**
   * Dedicated rate limit test endpoint for order creation (max: 2).
   */
  fastify.post(
    "/test-rate-limit-order",
    {
      config: {
        rateLimit: {
          max: 2,
          timeWindow: 60000,
        },
      },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      return formatSuccessResponse({ status: "order_rate_limit_active" }, req);
    }
  );

  /**
   * POST /api/v1/orders/validate
   * Public pre-checkout cart validation endpoint for dining customers.
   * Resolves QR context, validates menu items and modifiers, recalculates authoritative prices and taxes.
   */
  fastify.post(
    "/validate",
    {
      config: {
        rateLimit: cartValidationRateLimit,
      },
    },
    async (
      req: FastifyRequest<{ Body: ValidateCartRequest }>,
      reply: FastifyReply
    ) => {
      // Validate request body structure using Zod
      const parsed = validateCartRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send(
          formatErrorResponse(
            "VALIDATION_FAILED",
            "The request contains invalid cart parameters",
            parsed.error.issues.map((i) => ({
              field: i.path.join("."),
              issue: i.message,
            }))
          )
        );
      }

      // Security requirement: Never log raw QR token
      req.log.info({
        event: "cart_validation_request",
        tokenLength: parsed.data.qrToken.length,
        itemCount: parsed.data.items.length,
        requestId: req.id,
      });

      const result = await cartService.validateCart(parsed.data);

      return formatSuccessResponse(result, req);
    }
  );

  /**
   * POST /api/v1/orders
   * Create an authoritative order from a validated QR dining context.
   * Creates order items, initial KOT records, and supports durable Idempotency-Key.
   */
  fastify.post(
    "/",
    {
      config: {
        rateLimit: orderCreationRateLimit,
      },
    },
    async (
      req: FastifyRequest<{ Body: CreateOrderRequest }>,
      reply: FastifyReply
    ) => {
      // Validate headers (Idempotency-Key)
      const parsedHeaders = orderHeadersSchema.safeParse(req.headers);
      if (!parsedHeaders.success) {
        return reply.status(400).send(
          formatErrorResponse(
            "INVALID_HEADERS",
            "The request headers contain invalid values",
            parsedHeaders.error.issues.map((i) => ({
              field: i.path.join("."),
              issue: i.message,
            }))
          )
        );
      }

      const rawIdempotencyKey = req.headers["idempotency-key"];
      const idempotencyKey =
        typeof rawIdempotencyKey === "string" ? rawIdempotencyKey.trim() : undefined;

      // Validate request body
      const parsed = createOrderRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply.status(400).send(
          formatErrorResponse(
            "VALIDATION_FAILED",
            "The request contains invalid order parameters",
            parsed.error.issues.map((i) => ({
              field: i.path.join("."),
              issue: i.message,
            }))
          )
        );
      }

      // Security requirement: Never log raw QR token or credentials
      req.log.info({
        event: "order_creation_request",
        tokenLength: parsed.data.qrToken.length,
        itemCount: parsed.data.items.length,
        hasIdempotencyKey: !!idempotencyKey,
        requestId: req.id,
      });

      // Optional staff authentication (if provided, attach user role)
      let userRole: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const decoded = await req.jwtVerify<{ role?: string }>();
          userRole = decoded?.role;
        } catch {
          // Public customer fallback if token is expired/invalid
          userRole = undefined;
        }
      }

      const result = await orderService.createOrder(parsed.data, {
        idempotencyKey,
        userRole,
      });

      return reply
        .status(201)
        .send(formatSuccessResponse(result, req, "Order placed successfully"));
    }
  );
};
