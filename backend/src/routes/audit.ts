import type { FastifyPluginAsync } from "fastify";
import { formatSuccessResponse } from "../lib/errors.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { auditService } from "../services/audit.service.js";

export const auditRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  /**
   * GET /
   * List audit log records for the caller's hotel.
   */
  fastify.get(
    "/",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const caller = request.authenticatedUser!;
      const query = request.query as {
        limit?: string;
        offset?: string;
        action?: string;
        resource?: string;
        tenantId?: string;
      };

      const targetTenantId =
        caller.role === "SUPER_ADMIN" && query.tenantId ? query.tenantId : caller.role === "SUPER_ADMIN" ? null : caller.tenantId;

      const result = await auditService.listLogs(targetTenantId, {
        limit: query.limit ? parseInt(query.limit, 10) : 50,
        offset: query.offset ? parseInt(query.offset, 10) : 0,
        action: query.action,
        resource: query.resource,
      });

      return reply.status(200).send(formatSuccessResponse(result, request));
    }
  );
};
