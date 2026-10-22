import type { FastifyReply, FastifyRequest } from "fastify";
import { validate } from "../lib/validate.js";
import { sendSuccess } from "../lib/response.js";
import { getActor } from "../lib/context.js";
import { organizationService } from "../services/organization.service.js";
import {
  organizationIdParamSchema,
  createOrganizationSchema,
  updateOrganizationSchema,
  onboardFranchiseWizardSchema,
} from "../validations/organization.validation.js";
import type { ListOrganizationsQuery } from "../types/organization.types.js";

export const organizationController = {
  async listOrganizations(request: FastifyRequest, reply: FastifyReply) {
    const query = request.query as ListOrganizationsQuery;
    const organizations = await organizationService.listOrganizations(getActor(request), query);
    return sendSuccess(request, reply, organizations);
  },

  async createOrganization(request: FastifyRequest, reply: FastifyReply) {
    const actor = getActor(request);
    const data = validate(createOrganizationSchema, request.body);
    const org = await organizationService.createOrganization(actor, data);
    return sendSuccess(request, reply, org, 201);
  },

  async onboardFranchise(request: FastifyRequest, reply: FastifyReply) {
    const actor = getActor(request);
    const data = validate(onboardFranchiseWizardSchema, request.body);
    const result = await organizationService.onboardFranchise(actor, data);
    return sendSuccess(request, reply, result, 201);
  },

  async getOrganization(request: FastifyRequest, reply: FastifyReply) {
    const { id } = validate(organizationIdParamSchema, request.params);
    const org = await organizationService.getOrganization(getActor(request), id);
    return sendSuccess(request, reply, org);
  },

  async updateOrganization(request: FastifyRequest, reply: FastifyReply) {
    const { id } = validate(organizationIdParamSchema, request.params);
    const actor = getActor(request);
    // Existence and ownership are checked before the body is validated
    await organizationService.assertCanUpdate(actor, id);
    const data = validate(updateOrganizationSchema, request.body);
    const updated = await organizationService.updateOrganization(actor, id, data);
    return sendSuccess(request, reply, updated);
  },

  async getOrganizationStats(request: FastifyRequest, reply: FastifyReply) {
    const { id } = validate(organizationIdParamSchema, request.params);
    const stats = await organizationService.getOrganizationStats(getActor(request), id);
    return sendSuccess(request, reply, stats);
  },
};
