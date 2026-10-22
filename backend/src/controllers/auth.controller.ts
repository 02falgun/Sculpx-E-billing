import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { validate } from "../lib/validate.js";
import { sendSuccess } from "../lib/response.js";
import { getActor } from "../lib/context.js";
import { authService } from "../services/auth.service.js";
import { loginBodySchema } from "../validations/auth.validation.js";

export const authController = {
  async login(request: FastifyRequest, reply: FastifyReply) {
    const data = validate(loginBodySchema, request.body, "Request validation failed");
    const payload = await authService.login(data, (claims) =>
      request.server.jwt.sign(claims, { expiresIn: env.JWT_EXPIRES_IN })
    );
    return sendSuccess(request, reply, payload, 200, "Login successful");
  },

  async me(request: FastifyRequest, reply: FastifyReply) {
    return sendSuccess(request, reply, authService.getProfile(getActor(request).user));
  },

  async logout(request: FastifyRequest, reply: FastifyReply) {
    return sendSuccess(request, reply, null, 200, "Logged out successfully");
  },

  async testAdminOnly(request: FastifyRequest, reply: FastifyReply) {
    return sendSuccess(
      request,
      reply,
      { authorized: true, user: request.authenticatedUser },
      200,
      "Admin access verified"
    );
  },

  async testRateLimit(request: FastifyRequest, reply: FastifyReply) {
    return sendSuccess(request, reply, { ok: true });
  },
};
