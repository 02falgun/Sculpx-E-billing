import type { FastifyReply, FastifyRequest } from "fastify";
import { validate } from "../lib/validate.js";
import { sendSuccess } from "../lib/response.js";
import { getActor } from "../lib/context.js";
import { kitchenService } from "../services/kitchen.service.js";
import {
  kotParamsSchema,
  updateKotStatusBodySchema,
  getKotsQuerySchema,
} from "../validations/kitchen.validation.js";

const INVALID_KOT_ID_MESSAGE = "Invalid KOT identifier in URL parameter";

export const kitchenController = {
  async getActiveKots(request: FastifyRequest, reply: FastifyReply) {
    // Invalid query is ignored rather than rejected
    const parsedQuery = getKotsQuerySchema.safeParse(request.query);
    const station = parsedQuery.success ? parsedQuery.data.station : undefined;

    const { user } = getActor(request);
    const kots = await kitchenService.getActiveKots(user.tenantId, station);
    return sendSuccess(request, reply, kots);
  },

  async getKotById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = validate(kotParamsSchema, request.params, INVALID_KOT_ID_MESSAGE);
    const { user } = getActor(request);
    const kot = await kitchenService.getKotById(user.tenantId, id);
    return sendSuccess(request, reply, kot);
  },

  async updateKotStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id } = validate(kotParamsSchema, request.params, INVALID_KOT_ID_MESSAGE);
    const { status, note } = validate(
      updateKotStatusBodySchema,
      request.body,
      "The request contains invalid status transition parameters"
    );

    const { user } = getActor(request);
    const tenantId = user.tenantId;

    request.log.info({
      event: "kot_status_update_requested",
      kotId: id,
      requestedStatus: status,
      userId: user.id,
      userRole: user.role,
      tenantId,
    });

    const updatedKot = await kitchenService.updateKotStatus(tenantId, id, status, note);

    return sendSuccess(
      request,
      reply,
      updatedKot,
      200,
      `KOT #${updatedKot.kotNumber} status updated to ${updatedKot.status}`
    );
  },
};
