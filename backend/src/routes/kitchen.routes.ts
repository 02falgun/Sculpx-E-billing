import type { FastifyPluginAsync } from "fastify";
import { requireRoles } from "../middleware/auth.js";
import { kitchenController } from "../controllers/kitchen.controller.js";

// KDS access: KITCHEN_STAFF, MANAGER, ADMIN, SUPER_ADMIN
const kitchenAuthGuard = requireRoles("KITCHEN_STAFF", "MANAGER", "ADMIN", "SUPER_ADMIN");

export const kitchenRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/kots", { preHandler: [kitchenAuthGuard] }, kitchenController.getActiveKots);
  fastify.get("/kots/:id", { preHandler: [kitchenAuthGuard] }, kitchenController.getKotById);

  // Lifecycle: NEW (PENDING) -> ACCEPTED -> PREPARING -> READY -> SERVED
  fastify.patch(
    "/kots/:id/status",
    { preHandler: [kitchenAuthGuard] },
    kitchenController.updateKotStatus
  );
};
