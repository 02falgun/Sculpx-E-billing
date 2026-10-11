import type { FastifyPluginAsync } from "fastify";
import { printAgentGatewayService } from "../services/print-agent-gateway.service.js";
import { requireRoles } from "../middleware/auth.js";
import {
  registerPrintAgentBodySchema,
  printAgentIdParamSchema,
  bindPrintersBodySchema,
} from "../schemas/print-agent.schema.js";

/**
 * Fastify routes plugin for Print Agent Device Administration (/print-agents).
 */
export const printAgentRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /print-agents
   * List registered print agents for tenant.
   * Access: ADMIN, SUPER_ADMIN, MANAGER.
   */
  fastify.get(
    "/",
    {
      preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER")],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;
      const agents = await printAgentGatewayService.listAgents(user.tenantId);

      return reply.code(200).send({
        success: true,
        data: agents,
      });
    }
  );

  /**
   * GET /print-agents/:id
   * Get single print agent by ID.
   * Access: ADMIN, SUPER_ADMIN, MANAGER.
   */
  fastify.get(
    "/:id",
    {
      preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER")],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;
      const { id } = printAgentIdParamSchema.parse(request.params);

      const agent = await printAgentGatewayService.getAgentById(user.tenantId, id);

      return reply.code(200).send({
        success: true,
        data: agent,
      });
    }
  );

  /**
   * POST /print-agents
   * Register a new print agent device and issue API credential.
   * Access: ADMIN, SUPER_ADMIN.
   */
  fastify.post(
    "/",
    {
      preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;
      const body = registerPrintAgentBodySchema.parse(request.body);

      const result = await printAgentGatewayService.registerAgent(user.tenantId, body);

      return reply.code(201).send({
        success: true,
        data: {
          agent: {
            ...result.agent,
            apiKeyHash: undefined,
          },
          apiKey: result.apiKey,
        },
        message: "Print agent registered successfully. Store API key safely; it cannot be retrieved again.",
      });
    }
  );

  /**
   * POST /print-agents/:id/rotate-key
   * Rotate API key for an agent device. Invalidates prior key immediately.
   * Access: ADMIN, SUPER_ADMIN.
   */
  fastify.post(
    "/:id/rotate-key",
    {
      preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;
      const { id } = printAgentIdParamSchema.parse(request.params);

      const result = await printAgentGatewayService.rotateApiKey(user.tenantId, id);

      return reply.code(200).send({
        success: true,
        data: result,
        message: "Agent credential rotated successfully. Device must reconnect with new key.",
      });
    }
  );

  /**
   * POST /print-agents/:id/revoke
   * Revoke device authorization and terminate active connection immediately.
   * Access: ADMIN, SUPER_ADMIN.
   */
  fastify.post(
    "/:id/revoke",
    {
      preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;
      const { id } = printAgentIdParamSchema.parse(request.params);

      await printAgentGatewayService.revokeAgent(user.tenantId, id);

      return reply.code(200).send({
        success: true,
        message: "Print agent device authorization revoked",
      });
    }
  );

  /**
   * PUT /print-agents/:id/printers
   * Bind/unbind permitted printer IDs for agent.
   * Access: ADMIN, SUPER_ADMIN.
   */
  fastify.put(
    "/:id/printers",
    {
      preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;
      const { id } = printAgentIdParamSchema.parse(request.params);
      const body = bindPrintersBodySchema.parse(request.body);

      const updated = await printAgentGatewayService.bindPrinters(user.tenantId, id, body.printerIds);

      return reply.code(200).send({
        success: true,
        data: updated,
        message: "Agent permitted printer routing updated",
      });
    }
  );
};
