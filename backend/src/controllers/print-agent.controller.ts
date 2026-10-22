import type { FastifyReply, FastifyRequest } from "fastify";
import { validate } from "../lib/validate.js";
import { sendSuccess } from "../lib/response.js";
import { getActor } from "../lib/context.js";
import { printAgentGatewayService } from "../services/print-agent-gateway.service.js";
import {
  registerPrintAgentBodySchema,
  printAgentIdParamSchema,
  bindPrintersBodySchema,
} from "../validations/print-agent.validation.js";

export const printAgentController = {
  async listAgents(request: FastifyRequest, reply: FastifyReply) {
    const { user } = getActor(request);
    const agents = await printAgentGatewayService.listAgents(user.tenantId);
    return sendSuccess(request, reply, agents);
  },

  async getAgent(request: FastifyRequest, reply: FastifyReply) {
    const { user } = getActor(request);
    const { id } = validate(printAgentIdParamSchema, request.params);
    const agent = await printAgentGatewayService.getAgentById(user.tenantId, id);
    return sendSuccess(request, reply, agent);
  },

  async registerAgent(request: FastifyRequest, reply: FastifyReply) {
    const { user } = getActor(request);
    const body = validate(registerPrintAgentBodySchema, request.body);
    const result = await printAgentGatewayService.registerAgent(user.tenantId, body);
    const data = { agent: { ...result.agent, apiKeyHash: undefined }, apiKey: result.apiKey };
    return sendSuccess(
      request,
      reply,
      data,
      201,
      "Print agent registered successfully. Store API key safely; it cannot be retrieved again."
    );
  },

  async rotateApiKey(request: FastifyRequest, reply: FastifyReply) {
    const { user } = getActor(request);
    const { id } = validate(printAgentIdParamSchema, request.params);
    const result = await printAgentGatewayService.rotateApiKey(user.tenantId, id);
    return sendSuccess(request, reply, result, 200, "Agent credential rotated successfully. Device must reconnect with new key.");
  },

  async revokeAgent(request: FastifyRequest, reply: FastifyReply) {
    const { user } = getActor(request);
    const { id } = validate(printAgentIdParamSchema, request.params);
    await printAgentGatewayService.revokeAgent(user.tenantId, id);
    return sendSuccess(request, reply, null, 200, "Print agent device authorization revoked");
  },

  async bindPrinters(request: FastifyRequest, reply: FastifyReply) {
    const { user } = getActor(request);
    const { id } = validate(printAgentIdParamSchema, request.params);
    const body = validate(bindPrintersBodySchema, request.body);
    const updated = await printAgentGatewayService.bindPrinters(user.tenantId, id, body.printerIds);
    return sendSuccess(request, reply, updated, 200, "Agent permitted printer routing updated");
  },
};
