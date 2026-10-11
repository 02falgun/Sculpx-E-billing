import type { FastifyPluginAsync } from "fastify";
import { printerService } from "../services/printer.service.js";
import { printJobService } from "../services/print-job.service.js";
import { requireRoles } from "../middleware/auth.js";
import {
  createPrinterBodySchema,
  updatePrinterBodySchema,
  printerIdParamSchema,
  listPrintersQuerySchema,
  createPrintJobBodySchema,
  listPrintJobsQuerySchema,
  printJobIdParamSchema,
  reprintJobBodySchema,
} from "../schemas/printer.schema.js";

/**
 * Fastify plugin for Printer hardware registry endpoints (/printers).
 */
export const printerRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /printers
   * List all configured printers for tenant.
   * Access: ADMIN, SUPER_ADMIN, MANAGER.
   */
  fastify.get(
    "/",
    {
      preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER")],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;
      const query = listPrintersQuerySchema.parse(request.query);

      const printers = await printerService.listPrinters(user.tenantId, query);

      return reply.code(200).send({
        success: true,
        data: printers,
      });
    }
  );

  /**
   * GET /printers/summary
   * Operational metrics for printer fleet and print queue.
   * Access: ADMIN, SUPER_ADMIN, MANAGER.
   */
  fastify.get(
    "/summary",
    {
      preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER")],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;
      const summary = await printerService.getOperationalSummary(user.tenantId);

      return reply.code(200).send({
        success: true,
        data: summary,
      });
    }
  );

  /**
   * GET /printers/:id
   * Retrieve single printer configuration.
   * Access: ADMIN, SUPER_ADMIN, MANAGER.
   */
  fastify.get(
    "/:id",
    {
      preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER")],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;
      const { id } = printerIdParamSchema.parse(request.params);

      const printer = await printerService.getPrinterById(user.tenantId, id);

      return reply.code(200).send({
        success: true,
        data: printer,
      });
    }
  );

  /**
   * POST /printers
   * Create a new printer device for tenant.
   * Access: ADMIN, SUPER_ADMIN.
   */
  fastify.post(
    "/",
    {
      preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;
      const body = createPrinterBodySchema.parse(request.body);

      const created = await printerService.createPrinter(user.tenantId, body);

      return reply.code(201).send({
        success: true,
        data: created,
        message: "Printer registered successfully",
      });
    }
  );

  /**
   * PUT /printers/:id
   * Full or partial update of printer device.
   * Access: ADMIN, SUPER_ADMIN.
   */
  fastify.put(
    "/:id",
    {
      preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;
      const { id } = printerIdParamSchema.parse(request.params);
      const body = updatePrinterBodySchema.parse(request.body);

      const updated = await printerService.updatePrinter(user.tenantId, id, body);

      return reply.code(200).send({
        success: true,
        data: updated,
        message: "Printer updated successfully",
      });
    }
  );

  /**
   * PATCH /printers/:id
   * Partial update alias.
   * Access: ADMIN, SUPER_ADMIN.
   */
  fastify.patch(
    "/:id",
    {
      preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;
      const { id } = printerIdParamSchema.parse(request.params);
      const body = updatePrinterBodySchema.parse(request.body);

      const updated = await printerService.updatePrinter(user.tenantId, id, body);

      return reply.code(200).send({
        success: true,
        data: updated,
        message: "Printer updated successfully",
      });
    }
  );

  /**
   * DELETE /printers/:id
   * Soft-deactivates or deletes printer device.
   * Access: ADMIN, SUPER_ADMIN.
   */
  fastify.delete(
    "/:id",
    {
      preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;
      const { id } = printerIdParamSchema.parse(request.params);

      const result = await printerService.deletePrinter(user.tenantId, id);

      return reply.code(200).send({
        success: true,
        data: result,
        message: result.deactivated
          ? "Printer has historical jobs; marked as disabled"
          : "Printer removed successfully",
      });
    }
  );

  /**
   * POST /printers/:id/ping
   * Health probe hardware device directly.
   * Access: ADMIN, SUPER_ADMIN, MANAGER.
   */
  fastify.post(
    "/:id/ping",
    {
      preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER")],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;
      const { id } = printerIdParamSchema.parse(request.params);

      const result = await printerService.pingPrinter(user.tenantId, id);

      return reply.code(200).send({
        success: true,
        data: result,
      });
    }
  );

  /**
   * POST /printers/:id/test
   * Queue diagnostic test slip to specified printer.
   * Access: ADMIN, SUPER_ADMIN, MANAGER.
   */
  fastify.post(
    "/:id/test",
    {
      preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER")],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;
      const { id } = printerIdParamSchema.parse(request.params);

      const printer = await printerService.getPrinterById(user.tenantId, id);

      const testJob = await printJobService.createJob(user.tenantId, {
        printerId: printer.id,
        type: "TEST_PAGE",
        referenceId: `TEST-${Date.now()}`,
        payload: {
          printerName: printer.name,
          printerId: printer.id,
          ipAddress: printer.ipAddress,
          port: printer.port,
          station: printer.station,
          paperWidthMm: printer.paperWidthMm,
          connectionType: printer.connectionType,
          timestamp: new Date().toISOString(),
        },
        initiatedBy: `Staff: ${user.name} (${user.role})`,
      });

      return reply.code(201).send({
        success: true,
        data: testJob,
        message: "Diagnostic test print dispatched to queue",
      });
    }
  );
};

/**
 * Fastify plugin for Print Jobs queue and management (/print-jobs).
 */
export const printJobRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /print-jobs
   * List paginated print jobs.
   * Access: ADMIN, SUPER_ADMIN, MANAGER, CASHIER.
   */
  fastify.get(
    "/",
    {
      preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER", "CASHIER")],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;
      const query = listPrintJobsQuerySchema.parse(request.query);

      const result = await printJobService.listJobs(user.tenantId, query);

      return reply.code(200).send({
        success: true,
        data: result,
      });
    }
  );

  /**
   * POST /print-jobs
   * Create or queue a print job.
   * Access: ADMIN, SUPER_ADMIN, MANAGER, CASHIER, WAITER, CAPTAIN.
   */
  fastify.post(
    "/",
    {
      preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER", "CASHIER", "WAITER", "CAPTAIN")],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;
      const body = createPrintJobBodySchema.parse(request.body);

      const job = await printJobService.createJob(user.tenantId, {
        printerId: body.printerId,
        type: body.type,
        referenceId: body.referenceId,
        station: body.station,
        payload: body.payload || { referenceId: body.referenceId, type: body.type },
        idempotencyKey: body.idempotencyKey,
        initiatedBy: `${user.name} (${user.role})`,
      });

      return reply.code(201).send({
        success: true,
        data: job,
        message: "Print job queued successfully",
      });
    }
  );

  /**
   * GET /print-jobs/:id
   * Get print job by ID.
   * Access: ADMIN, SUPER_ADMIN, MANAGER, CASHIER.
   */
  fastify.get(
    "/:id",
    {
      preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER", "CASHIER")],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;
      const { id } = printJobIdParamSchema.parse(request.params);

      const job = await printJobService.getJobById(user.tenantId, id);

      return reply.code(200).send({
        success: true,
        data: job,
      });
    }
  );

  /**
   * POST /print-jobs/:id/retry
   * Controlled manual retry for failed or uncertain jobs.
   * Access: ADMIN, SUPER_ADMIN, MANAGER.
   */
  fastify.post(
    "/:id/retry",
    {
      preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER")],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;
      const { id } = printJobIdParamSchema.parse(request.params);

      const retried = await printJobService.retryJob(user.tenantId, id, user.id);

      return reply.code(200).send({
        success: true,
        data: retried,
        message: "Print job re-queued for execution",
      });
    }
  );

  /**
   * POST /print-jobs/:id/reprint
   * Issue duplicate reprint copy with visible watermark.
   * Access: ADMIN, SUPER_ADMIN, MANAGER, CASHIER.
   */
  fastify.post(
    "/:id/reprint",
    {
      preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER", "CASHIER")],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;
      const { id } = printJobIdParamSchema.parse(request.params);
      const body = reprintJobBodySchema.parse(request.body || {});

      const duplicate = await printJobService.reprintJob(user.tenantId, id, user.id, body.reason);

      return reply.code(201).send({
        success: true,
        data: duplicate,
        message: "Reprint copy queued with watermark",
      });
    }
  );

  /**
   * POST /print-jobs/:id/cancel
   * Cancel queued print job.
   * Access: ADMIN, SUPER_ADMIN, MANAGER.
   */
  fastify.post(
    "/:id/cancel",
    {
      preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER")],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;
      const { id } = printJobIdParamSchema.parse(request.params);

      const cancelled = await printJobService.cancelJob(user.tenantId, id, user.id);

      return reply.code(200).send({
        success: true,
        data: cancelled,
        message: "Print job cancelled",
      });
    }
  );
};
