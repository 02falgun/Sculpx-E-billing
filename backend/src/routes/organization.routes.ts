import type { FastifyPluginAsync } from "fastify";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { organizationController } from "../controllers/organization.controller.js";

const superAdminOnly = requireRoles("SUPER_ADMIN");

export const organizationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  // Organizations (Super Admin sees all, members see their own)
  fastify.get("/", organizationController.listOrganizations);
  fastify.post("/", { preHandler: [superAdminOnly] }, organizationController.createOrganization);

  // Franchise onboarding wizard
  fastify.post(
    "/franchise/onboard",
    { preHandler: [superAdminOnly] },
    organizationController.onboardFranchise
  );

  fastify.get("/:id", organizationController.getOrganization);
  fastify.put("/:id", organizationController.updateOrganization);
  fastify.get("/:id/stats", organizationController.getOrganizationStats);
};
