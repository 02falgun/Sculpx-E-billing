import type { FastifyPluginAsync } from "fastify";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { tenantController } from "../controllers/tenant.controller.js";

export const tenantRoutes: FastifyPluginAsync = async (fastify) => {
  // Platform tenant registry
  fastify.get("/", { preHandler: [authenticate, requireRoles("SUPER_ADMIN")] }, tenantController.listTenants);

  // Hotel onboarding (Super Admin bearer token or platform bootstrap token)
  fastify.post("/", tenantController.onboardHotel);
  fastify.post("/onboard", tenantController.onboardHotel);

  // Current hotel profile
  fastify.get("/current", { preHandler: [authenticate] }, tenantController.getCurrentTenant);
  fastify.patch(
    "/current",
    { preHandler: [authenticate, requireRoles("ADMIN", "SUPER_ADMIN")] },
    tenantController.updateCurrentTenant
  );

  // Pilot readiness
  fastify.get(
    "/readiness",
    { preHandler: [authenticate, requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER")] },
    tenantController.getReadiness
  );
};
