import type { FastifyPluginAsync } from "fastify";
import { authenticate, requireRoles, requireTenantScope } from "../middleware/auth.js";
import { tableController } from "../controllers/table.controller.js";

const tableManagers = requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER");

export const tableRoutes: FastifyPluginAsync = async (fastify) => {
  // Public customer menu accesses tables read-only via QR token; staff requests are authenticated
  fastify.addHook("preHandler", async (req, reply) => {
    if (req.headers.authorization) {
      await authenticate(req, reply);
    }
  });

  fastify.get("/", tableController.listTables);
  fastify.post(
    "/",
    { preHandler: [authenticate, tableManagers, requireTenantScope] },
    tableController.createTable
  );
  fastify.get("/:id", tableController.getTable);
  fastify.patch("/:id", { preHandler: [authenticate, tableManagers] }, tableController.updateTable);
  fastify.patch("/:id/status", tableController.updateTableStatus);
  fastify.post("/:id/qr/rotate", { preHandler: [authenticate, tableManagers] }, tableController.rotateQr);
  fastify.delete(
    "/:id",
    { preHandler: [authenticate, requireRoles("ADMIN", "SUPER_ADMIN")] },
    tableController.deactivateTable
  );
};
