import type { FastifyReply, FastifyRequest } from "fastify";
import { validate } from "../lib/validate.js";
import { sendSuccess } from "../lib/response.js";
import { getActor } from "../lib/context.js";
import { roleService } from "../services/role.service.js";
import {
  roleIdParamSchema,
  createCustomRoleSchema,
  updateCustomRoleSchema,
} from "../validations/role.validation.js";

export const roleController = {
  async getCatalog(request: FastifyRequest, reply: FastifyReply) {
    return sendSuccess(request, reply, roleService.getCatalog());
  },

  async listCustomRoles(request: FastifyRequest, reply: FastifyReply) {
    const roles = await roleService.listCustomRoles(getActor(request));
    return sendSuccess(request, reply, roles);
  },

  async createCustomRole(request: FastifyRequest, reply: FastifyReply) {
    const data = validate(createCustomRoleSchema, request.body);
    const role = await roleService.createCustomRole(getActor(request), data);
    return sendSuccess(request, reply, role, 201, "Custom role created successfully");
  },

  async updateCustomRole(request: FastifyRequest, reply: FastifyReply) {
    const { id } = validate(roleIdParamSchema, request.params);
    const data = validate(updateCustomRoleSchema, request.body);
    const role = await roleService.updateCustomRole(getActor(request), id, data);
    return sendSuccess(request, reply, role, 200, "Custom role updated");
  },

  async deleteCustomRole(request: FastifyRequest, reply: FastifyReply) {
    const { id } = validate(roleIdParamSchema, request.params);
    await roleService.deleteCustomRole(getActor(request), id);
    return sendSuccess(request, reply, null, 200, "Custom role deleted successfully");
  },
};
