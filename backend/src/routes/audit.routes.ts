import type { FastifyPluginAsync } from "fastify";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { auditController } from "../controllers/audit.controller.js";

export const auditRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  fastify.get("/", { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] }, auditController.listLogs);
};
