import type { FastifyPluginAsync } from "fastify";
import { requireRoles } from "../middleware/auth.js";
import { printerController, printJobController } from "../controllers/printer.controller.js";

const printerAdmins = requireRoles("ADMIN", "SUPER_ADMIN");
const printerOperators = requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER");

// Printer hardware registry (/printers)
export const printerRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/", { preHandler: [printerOperators] }, printerController.listPrinters);
  fastify.get("/summary", { preHandler: [printerOperators] }, printerController.getSummary);
  fastify.get("/:id", { preHandler: [printerOperators] }, printerController.getPrinter);
  fastify.post("/", { preHandler: [printerAdmins] }, printerController.createPrinter);
  fastify.put("/:id", { preHandler: [printerAdmins] }, printerController.updatePrinter);
  fastify.patch("/:id", { preHandler: [printerAdmins] }, printerController.updatePrinter);
  fastify.delete("/:id", { preHandler: [printerAdmins] }, printerController.deletePrinter);
  fastify.post("/:id/ping", { preHandler: [printerOperators] }, printerController.pingPrinter);
  fastify.post("/:id/test", { preHandler: [printerOperators] }, printerController.testPrinter);
};

// Print job queue and management (/print-jobs)
export const printJobRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    "/",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER", "CASHIER")] },
    printJobController.listJobs
  );
  fastify.post(
    "/",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER", "CASHIER", "WAITER", "CAPTAIN")] },
    printJobController.createJob
  );
  fastify.get(
    "/:id",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER", "CASHIER")] },
    printJobController.getJob
  );
  fastify.post(
    "/:id/retry",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER")] },
    printJobController.retryJob
  );
  fastify.post(
    "/:id/reprint",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER", "CASHIER")] },
    printJobController.reprintJob
  );
  fastify.post(
    "/:id/cancel",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER")] },
    printJobController.cancelJob
  );
};
