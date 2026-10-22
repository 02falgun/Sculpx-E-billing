import type { FastifyReply, FastifyRequest } from "fastify";
import { validate } from "../lib/validate.js";
import { sendSuccess } from "../lib/response.js";
import { qrService } from "../services/qr.service.js";
import { qrTokenParamSchema } from "../validations/qr.validation.js";

export const qrController = {
  async testRateLimit(request: FastifyRequest, reply: FastifyReply) {
    return sendSuccess(request, reply, { status: "rate_limit_active" });
  },

  async resolveQrContext(request: FastifyRequest, reply: FastifyReply) {
    const { token } = validate(qrTokenParamSchema, request.params, "Invalid QR token format");

    // Security requirement: never log the raw QR token
    request.log.info({
      event: "qr_context_resolution_request",
      tokenLength: token.length,
      requestId: request.id,
    });

    const qrContext = await qrService.resolvePublicQrContext(token);
    return sendSuccess(request, reply, qrContext);
  },
};
