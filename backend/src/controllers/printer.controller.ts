import type { FastifyReply, FastifyRequest } from "fastify";
import { validate } from "../lib/validate.js";
import { sendSuccess } from "../lib/response.js";
import { getActor } from "../lib/context.js";
import { printerService } from "../services/printer.service.js";
import { printJobService } from "../services/print-job.service.js";
import {
  createPrinterBodySchema,
  updatePrinterBodySchema,
  printerIdParamSchema,
  listPrintersQuerySchema,
  createPrintJobBodySchema,
  listPrintJobsQuerySchema,
  printJobIdParamSchema,
  reprintJobBodySchema,
} from "../validations/printer.validation.js";

export const printerController = {
  async listPrinters(request: FastifyRequest, reply: FastifyReply) {
    const { user } = getActor(request);
    const query = validate(listPrintersQuerySchema, request.query);
    const printers = await printerService.listPrinters(user.tenantId, query);
    return sendSuccess(request, reply, printers);
  },

  async getSummary(request: FastifyRequest, reply: FastifyReply) {
    const { user } = getActor(request);
    const summary = await printerService.getOperationalSummary(user.tenantId);
    return sendSuccess(request, reply, summary);
  },

  async getPrinter(request: FastifyRequest, reply: FastifyReply) {
    const { user } = getActor(request);
    const { id } = validate(printerIdParamSchema, request.params);
    const printer = await printerService.getPrinterById(user.tenantId, id);
    return sendSuccess(request, reply, printer);
  },

  async createPrinter(request: FastifyRequest, reply: FastifyReply) {
    const { user } = getActor(request);
    const body = validate(createPrinterBodySchema, request.body);
    const created = await printerService.createPrinter(user.tenantId, body);
    return sendSuccess(request, reply, created, 201, "Printer registered successfully");
  },

  async updatePrinter(request: FastifyRequest, reply: FastifyReply) {
    const { user } = getActor(request);
    const { id } = validate(printerIdParamSchema, request.params);
    const body = validate(updatePrinterBodySchema, request.body);
    const updated = await printerService.updatePrinter(user.tenantId, id, body);
    return sendSuccess(request, reply, updated, 200, "Printer updated successfully");
  },

  async deletePrinter(request: FastifyRequest, reply: FastifyReply) {
    const { user } = getActor(request);
    const { id } = validate(printerIdParamSchema, request.params);
    const result = await printerService.deletePrinter(user.tenantId, id);
    const message = result.deactivated
      ? "Printer has historical jobs; marked as disabled"
      : "Printer removed successfully";
    return sendSuccess(request, reply, result, 200, message);
  },

  async pingPrinter(request: FastifyRequest, reply: FastifyReply) {
    const { user } = getActor(request);
    const { id } = validate(printerIdParamSchema, request.params);
    const result = await printerService.pingPrinter(user.tenantId, id);
    return sendSuccess(request, reply, result);
  },

  async testPrinter(request: FastifyRequest, reply: FastifyReply) {
    const { user } = getActor(request);
    const { id } = validate(printerIdParamSchema, request.params);
    const testJob = await printJobService.createTestJob(
      user.tenantId,
      id,
      `Staff: ${user.name} (${user.role})`
    );
    return sendSuccess(request, reply, testJob, 201, "Diagnostic test print dispatched to queue");
  },
};

export const printJobController = {
  async listJobs(request: FastifyRequest, reply: FastifyReply) {
    const { user } = getActor(request);
    const query = validate(listPrintJobsQuerySchema, request.query);
    const result = await printJobService.listJobs(user.tenantId, query);
    return sendSuccess(request, reply, result);
  },

  async createJob(request: FastifyRequest, reply: FastifyReply) {
    const { user } = getActor(request);
    const body = validate(createPrintJobBodySchema, request.body);
    const job = await printJobService.createJob(user.tenantId, {
      printerId: body.printerId,
      type: body.type,
      referenceId: body.referenceId,
      station: body.station,
      payload: body.payload || { referenceId: body.referenceId, type: body.type },
      idempotencyKey: body.idempotencyKey,
      initiatedBy: `${user.name} (${user.role})`,
    });
    return sendSuccess(request, reply, job, 201, "Print job queued successfully");
  },

  async getJob(request: FastifyRequest, reply: FastifyReply) {
    const { user } = getActor(request);
    const { id } = validate(printJobIdParamSchema, request.params);
    const job = await printJobService.getJobById(user.tenantId, id);
    return sendSuccess(request, reply, job);
  },

  async retryJob(request: FastifyRequest, reply: FastifyReply) {
    const { user } = getActor(request);
    const { id } = validate(printJobIdParamSchema, request.params);
    const retried = await printJobService.retryJob(user.tenantId, id, user.id);
    return sendSuccess(request, reply, retried, 200, "Print job re-queued for execution");
  },

  async reprintJob(request: FastifyRequest, reply: FastifyReply) {
    const { user } = getActor(request);
    const { id } = validate(printJobIdParamSchema, request.params);
    const body = validate(reprintJobBodySchema, request.body || {});
    const duplicate = await printJobService.reprintJob(user.tenantId, id, user.id, body.reason);
    return sendSuccess(request, reply, duplicate, 201, "Reprint copy queued with watermark");
  },

  async cancelJob(request: FastifyRequest, reply: FastifyReply) {
    const { user } = getActor(request);
    const { id } = validate(printJobIdParamSchema, request.params);
    const cancelled = await printJobService.cancelJob(user.tenantId, id, user.id);
    return sendSuccess(request, reply, cancelled, 200, "Print job cancelled");
  },
};
