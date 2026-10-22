import type { FastifyPluginAsync } from "fastify";
import { requireRoles } from "../middleware/auth.js";
import { printAgentController } from "../controllers/print-agent.controller.js";

const agentAdmins = requireRoles("ADMIN", "SUPER_ADMIN");
const agentViewers = requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER");

// Print agent device administration (/print-agents)
export const printAgentRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", { preHandler: [agentViewers] }, printAgentController.listAgents);
  fastify.get("/:id", { preHandler: [agentViewers] }, printAgentController.getAgent);
  fastify.post("/", { preHandler: [agentAdmins] }, printAgentController.registerAgent);
  fastify.post("/:id/rotate-key", { preHandler: [agentAdmins] }, printAgentController.rotateApiKey);
  fastify.post("/:id/revoke", { preHandler: [agentAdmins] }, printAgentController.revokeAgent);
  fastify.put("/:id/printers", { preHandler: [agentAdmins] }, printAgentController.bindPrinters);
};
