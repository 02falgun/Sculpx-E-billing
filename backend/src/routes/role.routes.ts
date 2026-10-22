import type { FastifyPluginAsync } from "fastify";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { roleController } from "../controllers/role.controller.js";

const roleAdmins = requireRoles("ADMIN", "SUPER_ADMIN");

export const roleRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  // Permission catalog and built-in role defaults
  fastify.get("/catalog", roleController.getCatalog);

  // Tenant custom roles
  fastify.get(
    "/custom",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER")] },
    roleController.listCustomRoles
  );
  fastify.post("/custom", { preHandler: [roleAdmins] }, roleController.createCustomRole);
  fastify.patch("/custom/:id", { preHandler: [roleAdmins] }, roleController.updateCustomRole);
  fastify.delete("/custom/:id", { preHandler: [roleAdmins] }, roleController.deleteCustomRole);
};
