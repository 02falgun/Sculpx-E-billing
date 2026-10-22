import type { FastifyPluginAsync } from "fastify";
import { healthRoutes } from "./health.routes.js";
import { authRoutes } from "./auth.routes.js";
import { userRoutes } from "./user.routes.js";
import { tenantRoutes } from "./tenant.routes.js";
import { organizationRoutes } from "./organization.routes.js";
import { locationRoutes } from "./location.routes.js";
import { roleRoutes } from "./role.routes.js";
import { auditRoutes } from "./audit.routes.js";
import { menuRoutes } from "./menu.routes.js";
import { qrRoutes } from "./qr.routes.js";
import { orderRoutes } from "./order.routes.js";
import { kitchenRoutes } from "./kitchen.routes.js";
import { billingRoutes } from "./billing.routes.js";
import { inventoryRoutes } from "./inventory.routes.js";
import { printerRoutes, printJobRoutes } from "./printer.routes.js";
import { printAgentRoutes } from "./print-agent.routes.js";
import { tableRoutes } from "./table.routes.js";
import { roomRoutes } from "./room.routes.js";

/**
 * Every API module and its URL prefix. Registered twice below:
 * once at /api/<prefix> and once at /api/v1/<prefix>.
 */
const modules: Array<[FastifyPluginAsync, string | undefined]> = [
  [healthRoutes, undefined], // /health, /ready
  [authRoutes, "/auth"],
  [userRoutes, "/users"],
  [tenantRoutes, "/tenants"],
  [organizationRoutes, "/organizations"],
  [locationRoutes, "/locations"],
  [roleRoutes, "/roles"],
  [auditRoutes, "/audit"],
  [menuRoutes, "/menu"],
  [qrRoutes, "/public"],
  [orderRoutes, "/orders"],
  [kitchenRoutes, "/kitchen"],
  [billingRoutes, "/bills"],
  [inventoryRoutes, "/inventory"],
  [printerRoutes, "/printers"],
  [printJobRoutes, "/print-jobs"],
  [printAgentRoutes, "/print-agents"],
  [tableRoutes, "/tables"],
  [roomRoutes, "/rooms"],
];

const registerModules: FastifyPluginAsync = async (fastify) => {
  for (const [plugin, prefix] of modules) {
    await fastify.register(plugin, prefix ? { prefix } : {});
  }
};

export const apiRoutes: FastifyPluginAsync = async (fastify) => {
  // Unversioned: /api/...
  await fastify.register(registerModules);

  // Versioned contract: /api/v1/...
  await fastify.register(registerModules, { prefix: "/v1" });
};
