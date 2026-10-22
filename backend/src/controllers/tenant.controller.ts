import type { FastifyReply, FastifyRequest } from "fastify";
import { validate } from "../lib/validate.js";
import { sendSuccess } from "../lib/response.js";
import { getActor } from "../lib/context.js";
import { ForbiddenError } from "../lib/errors.js";
import { authenticate } from "../middleware/auth.js";
import { tenantService } from "../services/tenant.service.js";
import type { OnboardActor } from "../types/tenant.types.js";
import { onboardHotelSchema, updateTenantSchema } from "../validations/tenant.validation.js";

/**
 * Onboarding accepts either a valid platform bootstrap token or a SUPER_ADMIN bearer token.
 */
async function resolveOnboardActor(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<OnboardActor> {
  if (tenantService.isValidBootstrapToken(request.headers["x-bootstrap-token"])) {
    return { actorEmail: "PLATFORM_BOOTSTRAP", ipAddress: request.ip };
  }

  if (request.headers.authorization) {
    try {
      await authenticate(request, reply);
      const user = request.authenticatedUser;
      if (user?.role === "SUPER_ADMIN") {
        return { actorId: user.id, actorEmail: user.email, ipAddress: request.ip };
      }
    } catch {
      // Invalid bearer token: fall through to the 403 below
    }
  }

  throw new ForbiddenError("Unauthorized: hotel onboarding requires Super Admin privileges or valid bootstrap token");
}

export const tenantController = {
  async listTenants(request: FastifyRequest, reply: FastifyReply) {
    const tenants = await tenantService.listTenants();
    return sendSuccess(request, reply, tenants);
  },

  async onboardHotel(request: FastifyRequest, reply: FastifyReply) {
    const actor = await resolveOnboardActor(request, reply);
    const data = validate(onboardHotelSchema, request.body);
    const result = await tenantService.onboardHotel(actor, data);
    return sendSuccess(
      request,
      reply,
      result,
      201,
      "Hotel onboarded successfully. System initialized with clean empty state."
    );
  },

  async getCurrentTenant(request: FastifyRequest, reply: FastifyReply) {
    const tenant = await tenantService.getCurrentTenant(getActor(request));
    return sendSuccess(request, reply, tenant);
  },

  async updateCurrentTenant(request: FastifyRequest, reply: FastifyReply) {
    const actor = getActor(request);
    const data = validate(updateTenantSchema, request.body);
    const updated = await tenantService.updateCurrentTenant(actor, data);
    return sendSuccess(request, reply, updated, 200, "Hotel settings updated successfully");
  },

  async getReadiness(request: FastifyRequest, reply: FastifyReply) {
    const readiness = await tenantService.getReadiness(getActor(request));
    return sendSuccess(request, reply, readiness);
  },
};
