import type { FastifyPluginAsync } from "fastify";
import { healthRoutes } from "./health.js";
import { authRoutes } from "./auth.js";
import { menuRoutes } from "./menu.js";
import { qrRoutes } from "./qr.js";
import { orderRoutes } from "./order.js";
import { kitchenRoutes } from "./kitchen.js";
import { billingRoutes } from "./billing.js";
import { inventoryRoutes } from "./inventory.js";
import { printerRoutes, printJobRoutes } from "./printer.js";
import { printAgentRoutes } from "./print-agent.js";
import { tableRoutes } from "./table.js";
import { roomRoutes } from "./room.js";

export const apiRoutes: FastifyPluginAsync = async (fastify) => {
  // Direct /api/health and /api/ready
  await fastify.register(healthRoutes);

  // Direct /api/auth endpoints (/api/auth/login, /api/auth/me, /api/auth/logout)
  await fastify.register(authRoutes, { prefix: "/auth" });

  // Direct /api/menu endpoints
  await fastify.register(menuRoutes, { prefix: "/menu" });

  // Direct /api/public endpoints (/api/public/qr-context/:token)
  await fastify.register(qrRoutes, { prefix: "/public" });

  // Direct /api/orders endpoints (/api/orders/validate)
  await fastify.register(orderRoutes, { prefix: "/orders" });

  // Direct /api/kitchen endpoints (/api/kitchen/kots)
  await fastify.register(kitchenRoutes, { prefix: "/kitchen" });

  // Direct /api/bills endpoints (/api/bills/order/:orderId/generate)
  await fastify.register(billingRoutes, { prefix: "/bills" });

  // Direct /api/inventory endpoints (/api/inventory/items)
  await fastify.register(inventoryRoutes, { prefix: "/inventory" });

  // Direct /api/printers endpoints
  await fastify.register(printerRoutes, { prefix: "/printers" });

  // Direct /api/print-jobs endpoints
  await fastify.register(printJobRoutes, { prefix: "/print-jobs" });

  // Direct /api/print-agents endpoints
  await fastify.register(printAgentRoutes, { prefix: "/print-agents" });

  // Direct /api/tables endpoints
  await fastify.register(tableRoutes, { prefix: "/tables" });

  // Direct /api/rooms endpoints
  await fastify.register(roomRoutes, { prefix: "/rooms" });

  // Mount under /v1 for versioned API contract (/api/v1/...)
  await fastify.register(
    async (v1) => {
      await v1.register(healthRoutes);
      await v1.register(authRoutes, { prefix: "/auth" });
      await v1.register(menuRoutes, { prefix: "/menu" });
      await v1.register(qrRoutes, { prefix: "/public" });
      await v1.register(orderRoutes, { prefix: "/orders" });
      await v1.register(kitchenRoutes, { prefix: "/kitchen" });
      await v1.register(billingRoutes, { prefix: "/bills" });
      await v1.register(inventoryRoutes, { prefix: "/inventory" });
      await v1.register(printerRoutes, { prefix: "/printers" });
      await v1.register(printJobRoutes, { prefix: "/print-jobs" });
      await v1.register(printAgentRoutes, { prefix: "/print-agents" });
      await v1.register(tableRoutes, { prefix: "/tables" });
      await v1.register(roomRoutes, { prefix: "/rooms" });
    },
    { prefix: "/v1" }
  );
};
