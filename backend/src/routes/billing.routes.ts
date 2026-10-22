import type { FastifyPluginAsync } from "fastify";
import { requireRoles } from "../middleware/auth.js";
import { billingController } from "../controllers/billing.controller.js";

const billingStaff = requireRoles("CASHIER", "MANAGER", "ADMIN", "SUPER_ADMIN");
const billingManagers = requireRoles("MANAGER", "ADMIN", "SUPER_ADMIN");

export const billingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post("/order/:orderId/generate", { preHandler: [billingStaff] }, billingController.generateBill);

  // Optional auth: staff or public dining guest
  fastify.get("/:id", billingController.getBill);
  fastify.get("/order/:orderId", billingController.getBillByOrder);

  fastify.get("", { preHandler: [billingStaff] }, billingController.listBills);
  fastify.post("/:id/discount", { preHandler: [billingManagers] }, billingController.applyDiscount);
  fastify.post("/:id/void", { preHandler: [billingManagers] }, billingController.voidBill);

  // Optional auth: staff or guest checkout (Idempotency-Key supported)
  fastify.post("/:id/payments", billingController.recordPayment);
};
