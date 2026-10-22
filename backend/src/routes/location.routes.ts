import type { FastifyPluginAsync } from "fastify";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { locationController } from "../controllers/location.controller.js";

export const locationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  fastify.get("/", locationController.listLocations);
  fastify.post("/", { preHandler: [requireRoles("SUPER_ADMIN")] }, locationController.createLocation);
  fastify.get("/:id", locationController.getLocation);
  fastify.put("/:id", locationController.updateLocation);
  fastify.put(
    "/:id/status",
    { preHandler: [requireRoles("SUPER_ADMIN")] },
    locationController.updateLocationStatus
  );
  fastify.post(
    "/:id/assign-user",
    { preHandler: [requireRoles("SUPER_ADMIN", "ADMIN")] },
    locationController.assignUser
  );
  fastify.get("/:id/stats", locationController.getLocationStats);
};
