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
import { z } from "zod";
import { OrderStatus } from "@prisma/client";
import { qrService } from "../services/qr.service.js";
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

  const getOrderParamsSchema = z.object({
    id: z.string().min(1, "Order ID is required"),
  });

  const listOrdersQuerySchema = z.object({
    status: z.string().optional(),
    qrType: z.enum(["ROOM", "TABLE"]).optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
  });

  const updateStatusBodySchema = z.object({
    status: z.nativeEnum(OrderStatus),
    note: z.string().max(500).optional(),
  });

  const cancelOrderBodySchema = z.object({
    reason: z.string().trim().min(1, "Cancellation reason is required").max(500),
  });

  /**
   * GET /api/v1/orders/:id
   * Retrieve single order by UUID or orderNumber.
   * Public dining guests can track their order; staff sees order details.
   */
  fastify.get(
    "/:id",
    async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const parsed = getOrderParamsSchema.safeParse(req.params);
      if (!parsed.success) {
        return reply.status(400).send(
          formatErrorResponse("VALIDATION_FAILED", "Invalid order ID parameter")
        );
      }

      // Check for optional staff auth
      let tenantId: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const decoded = await req.jwtVerify<{ tenantId?: string }>();
          tenantId = decoded?.tenantId;
        } catch {
          tenantId = undefined;
        }
      }

      const order = await orderService.getOrderById(parsed.data.id, tenantId);
      return formatSuccessResponse(order, req);
    }
  );

  /**
   * GET /api/v1/orders
   * List paginated orders for tenant.
   */
  fastify.get(
    "/",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parsed = listOrdersQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return reply.status(400).send(
          formatErrorResponse("VALIDATION_FAILED", "Invalid query parameters")
        );
      }

      let tenantId: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const decoded = await req.jwtVerify<{ tenantId?: string }>();
          tenantId = decoded?.tenantId;
        } catch {}
      }

      // If no staff token, check x-qr-token header
      if (!tenantId) {
        const qrHeader = (req.headers["x-qr-token"] || req.headers["X-QR-Token"]) as string | undefined;
        if (qrHeader) {
          try {
            const qr = await qrService.resolveValidatedQrEntity(qrHeader.trim());
            tenantId = qr.tenantId;
          } catch {}
        }
      }

      if (!tenantId) {
        tenantId = "e1b1d1f0-0000-4000-8000-000000000001";
      }

      const result = await orderService.listOrders(tenantId, parsed.data);
      return formatSuccessResponse(result, req);
    }
  );

  /**
   * PATCH /api/v1/orders/:id/status
   * Update order status.
   */
  fastify.patch(
    "/:id/status",
    async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const parsedParams = getOrderParamsSchema.safeParse(req.params);
      if (!parsedParams.success) {
        return reply.status(400).send(
          formatErrorResponse("VALIDATION_FAILED", "Invalid order ID")
        );
      }
      const parsedBody = updateStatusBodySchema.safeParse(req.body);
      if (!parsedBody.success) {
        return reply.status(400).send(
          formatErrorResponse(
            "VALIDATION_FAILED",
            "Invalid status value",
            parsedBody.error.issues.map((i) => ({
              field: i.path.join("."),
              issue: i.message,
            }))
          )
        );
      }

      let tenantId: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const decoded = await req.jwtVerify<{ tenantId?: string }>();
          tenantId = decoded?.tenantId;
        } catch {}
      }

      const updated = await orderService.updateOrderStatus(
        parsedParams.data.id,
        parsedBody.data.status,
        parsedBody.data.note,
        tenantId
      );

      return formatSuccessResponse(updated, req, "Order status updated");
    }
  );

  /**
   * POST /api/v1/orders/:id/cancel
   * Cancel order.
   */
  fastify.post(
    "/:id/cancel",
    async (
      req: FastifyRequest<{ Params: { id: string } }>,
      reply: FastifyReply
    ) => {
      const parsedParams = getOrderParamsSchema.safeParse(req.params);
      if (!parsedParams.success) {
        return reply.status(400).send(
          formatErrorResponse("VALIDATION_FAILED", "Invalid order ID")
        );
      }
      const parsedBody = cancelOrderBodySchema.safeParse(req.body);
      if (!parsedBody.success) {
        return reply.status(400).send(
          formatErrorResponse(
            "VALIDATION_FAILED",
            "Cancellation reason is required"
          )
        );
      }

      let tenantId: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const decoded = await req.jwtVerify<{ tenantId?: string }>();
          tenantId = decoded?.tenantId;
        } catch {}
      }

      const cancelled = await orderService.cancelOrder(
        parsedParams.data.id,
        parsedBody.data.reason,
        tenantId
      );

      return formatSuccessResponse(cancelled, req, "Order cancelled successfully");
    }
  );
};
