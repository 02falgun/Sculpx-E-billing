import type { FastifyPluginAsync } from "fastify";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { userController } from "../controllers/user.controller.js";

const staffViewers = requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER");
const staffAdmins = requireRoles("ADMIN", "SUPER_ADMIN");

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  fastify.get("/", { preHandler: [staffViewers] }, userController.listUsers);
  fastify.post("/", { preHandler: [staffAdmins] }, userController.createUser);
  fastify.get("/:id", { preHandler: [staffViewers] }, userController.getUser);
  fastify.patch("/:id", { preHandler: [staffAdmins] }, userController.updateUser);
  fastify.patch("/:id/role", { preHandler: [staffAdmins] }, userController.updateRole);
  fastify.put("/:id/permissions", { preHandler: [staffAdmins] }, userController.updatePermissions);
  fastify.post("/:id/reset-password", { preHandler: [staffAdmins] }, userController.resetPassword);
  fastify.post("/:id/revoke-sessions", { preHandler: [staffAdmins] }, userController.revokeSessions);
  fastify.delete("/:id", { preHandler: [staffAdmins] }, userController.deleteUser);
};
