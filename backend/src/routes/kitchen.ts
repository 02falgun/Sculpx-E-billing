import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import { formatSuccessResponse, formatErrorResponse, AppError } from "../lib/errors.js";
import { requireRoles } from "../middleware/auth.js";
import { kitchenService } from "../services/kitchen.service.js";

const kotParamsSchema = z.object({
  id: z.string().uuid("Invalid KOT identifier format (must be UUID)"),
});

const updateKotStatusBodySchema = z.object({
  status: z.string().min(1, "Status is required"),
  note: z.string().max(500, "Note must be 500 characters or less").optional(),
});

const getKotsQuerySchema = z.object({
  station: z.string().optional(),
});

export const kitchenRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Only staff roles authorized for kitchen operations may access KDS endpoints:
   * KITCHEN_STAFF, MANAGER, ADMIN, SUPER_ADMIN.
   */
  const kitchenAuthGuard = requireRoles("KITCHEN_STAFF", "MANAGER", "ADMIN", "SUPER_ADMIN");

  /**
   * GET /kitchen/kots
   * Retrieve active KOTs for the kitchen display.
   */
  fastify.get(
    "/kots",
    { preHandler: [kitchenAuthGuard] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parsedQuery = getKotsQuerySchema.safeParse(req.query);
      const station = parsedQuery.success ? parsedQuery.data.station : undefined;

      const tenantId = req.authenticatedUser!.tenantId;
      const kots = await kitchenService.getActiveKots(tenantId, station);

      return reply.status(200).send(formatSuccessResponse(kots, req));
    }
  );

  /**
   * GET /kitchen/kots/:id
   * Retrieve single KOT ticket by ID.
   */
  fastify.get(
    "/kots/:id",
    { preHandler: [kitchenAuthGuard] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parsedParams = kotParamsSchema.safeParse(req.params);
      if (!parsedParams.success) {
        return reply.status(400).send(
          formatErrorResponse(
            "VALIDATION_FAILED",
            "Invalid KOT identifier in URL parameter",
            parsedParams.error.issues.map((i) => ({
              field: i.path.join("."),
              issue: i.message,
            }))
          )
        );
      }

      const tenantId = req.authenticatedUser!.tenantId;
      const kot = await kitchenService.getKotById(tenantId, parsedParams.data.id);

      return reply.status(200).send(formatSuccessResponse(kot, req));
    }
  );

  /**
   * PATCH /kitchen/kots/:id/status
   * Advance KOT status through the documented lifecycle:
   * NEW (PENDING) -> ACCEPTED -> PREPARING -> READY -> SERVED
   */
  fastify.patch(
    "/kots/:id/status",
    { preHandler: [kitchenAuthGuard] },
    async (req: FastifyRequest, reply: FastifyReply) => {
      // 1. Validate route params
      const parsedParams = kotParamsSchema.safeParse(req.params);
      if (!parsedParams.success) {
        return reply.status(400).send(
          formatErrorResponse(
            "VALIDATION_FAILED",
            "Invalid KOT identifier in URL parameter",
            parsedParams.error.issues.map((i) => ({
              field: i.path.join("."),
              issue: i.message,
            }))
          )
        );
      }

      // 2. Validate request body
      const parsedBody = updateKotStatusBodySchema.safeParse(req.body);
      if (!parsedBody.success) {
        return reply.status(400).send(
          formatErrorResponse(
            "VALIDATION_FAILED",
            "The request contains invalid status transition parameters",
            parsedBody.error.issues.map((i) => ({
              field: i.path.join("."),
              issue: i.message,
            }))
          )
        );
      }

      const tenantId = req.authenticatedUser!.tenantId;
      const { id } = parsedParams.data;
      const { status, note } = parsedBody.data;

      req.log.info({
        event: "kot_status_update_requested",
        kotId: id,
        requestedStatus: status,
        userId: req.authenticatedUser!.id,
        userRole: req.authenticatedUser!.role,
        tenantId,
      });

      const updatedKot = await kitchenService.updateKotStatus(
        tenantId,
        id,
        status,
        note
      );

      return reply.status(200).send(
        formatSuccessResponse(
          updatedKot,
          req,
          `KOT #${updatedKot.kotNumber} status updated to ${updatedKot.status}`
        )
      );
    }
  );
};
