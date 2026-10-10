import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { formatSuccessResponse, formatErrorResponse } from "../lib/errors.js";
import { cartService } from "../services/cart.service.js";
import { validateCartRequestSchema, type ValidateCartRequest } from "../schemas/cart.schema.js";
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
};
