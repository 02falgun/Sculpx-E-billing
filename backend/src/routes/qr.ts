import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { formatSuccessResponse, formatErrorResponse, AppError } from "../lib/errors.js";
import { qrService } from "../services/qr.service.js";
import { qrTokenParamSchema } from "../schemas/qr.schema.js";
import { env } from "../config/env.js";

export const qrRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Rate limiting for public QR resolution:
   * Defaults to 30 requests per minute per IP in production to prevent scanning brute-force.
   * Raised in test environment to avoid interfering with Vitest runs.
   */
  const publicQrRateLimit = {
    max: env.NODE_ENV === "test" ? 1000 : 30,
    timeWindow: 60000,
  };

  /**
   * Dedicated rate limit test endpoint with low threshold (max: 2).
   */
  fastify.get(
    "/test-rate-limit-qr",
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
   * GET /api/v1/public/qr-context/:token
   * Public endpoint resolving table or room QR token for dining customer without staff auth.
   */
  fastify.get(
    "/qr-context/:token",
    {
      config: {
        rateLimit: publicQrRateLimit,
      },
    },
    async (
      req: FastifyRequest<{ Params: { token: string } }>,
      reply: FastifyReply
    ) => {
      // Validate token structure using Zod
      const parsed = qrTokenParamSchema.safeParse(req.params);
      if (!parsed.success) {
        return reply.status(400).send(
          formatErrorResponse(
            "VALIDATION_FAILED",
            "Invalid QR token format",
            parsed.error.issues.map((i) => ({
              field: i.path.join("."),
              issue: i.message,
            }))
          )
        );
      }

      const { token } = parsed.data;

      // Security requirement: Never log raw QR token
      req.log.info({
        event: "qr_context_resolution_request",
        tokenLength: token.length,
        requestId: req.id,
      });

      const qrContext = await qrService.resolvePublicQrContext(token);

      return formatSuccessResponse(qrContext, req);
    }
  );
};
