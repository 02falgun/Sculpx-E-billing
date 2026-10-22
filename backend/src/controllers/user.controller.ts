import type { FastifyReply, FastifyRequest } from "fastify";
import { validate } from "../lib/validate.js";
import { sendSuccess } from "../lib/response.js";
import { getActor } from "../lib/context.js";
import { userService } from "../services/user.service.js";
import {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema,
  updatePermissionsSchema,
  parseRoleBody,
} from "../validations/user.validation.js";
import type { UserIdParams, UserListQuery } from "../types/user.types.js";

export const userController = {
  async listUsers(request: FastifyRequest, reply: FastifyReply) {
    const queryTenantId = (request.query as UserListQuery | undefined)?.tenantId;
    const users = await userService.listUsers(getActor(request), queryTenantId);
    return sendSuccess(request, reply, users);
  },

  async createUser(request: FastifyRequest, reply: FastifyReply) {
    const actor = getActor(request);
    const data = validate(createUserSchema, request.body);
    const user = await userService.createUser(actor, data);
    return sendSuccess(request, reply, user, 201, "Staff account created successfully");
  },

  async getUser(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as UserIdParams;
    const user = await userService.getUser(getActor(request), id);
    return sendSuccess(request, reply, user);
  },

  async updateUser(request: FastifyRequest, reply: FastifyReply) {
    const actor = getActor(request);
    const { id } = request.params as UserIdParams;
    const data = validate(updateUserSchema, request.body);
    const user = await userService.updateUser(actor, id, data);
    return sendSuccess(request, reply, user, 200, "Staff member updated successfully");
  },

  async updateRole(request: FastifyRequest, reply: FastifyReply) {
    const actor = getActor(request);
    const { id } = request.params as UserIdParams;
    const role = parseRoleBody(request.body);
    const user = await userService.updateRole(actor, id, role);
    return sendSuccess(request, reply, user, 200, "Role updated successfully");
  },

  async updatePermissions(request: FastifyRequest, reply: FastifyReply) {
    const actor = getActor(request);
    const { id } = request.params as UserIdParams;
    const data = validate(updatePermissionsSchema, request.body, "Invalid permissions payload");
    const result = await userService.updatePermissions(actor, id, data);
    return sendSuccess(request, reply, result, 200, "Permissions updated successfully");
  },

  async resetPassword(request: FastifyRequest, reply: FastifyReply) {
    const actor = getActor(request);
    const { id } = request.params as UserIdParams;
    const data = validate(resetPasswordSchema, request.body, "Invalid password payload");
    await userService.resetPassword(actor, id, data);
    return sendSuccess(request, reply, null, 200, "Password reset successfully. Active sessions revoked.");
  },

  async revokeSessions(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as UserIdParams;
    await userService.revokeSessions(getActor(request), id);
    return sendSuccess(request, reply, null, 200, "Sessions revoked successfully");
  },

  async deleteUser(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as UserIdParams;
    const result = await userService.deleteUser(getActor(request), id);
    return sendSuccess(request, reply, result, 200, "Employee deleted successfully");
  },
};
