import type { FastifyReply, FastifyRequest } from "fastify";
import { validate } from "../lib/validate.js";
import { sendSuccess } from "../lib/response.js";
import { getActor } from "../lib/context.js";
import { tableService } from "../services/table.service.js";
import {
  tableIdParamSchema,
  createTableSchema,
  updateTableSchema,
} from "../validations/table.validation.js";
import type { ListTablesQuery } from "../types/table.types.js";

export const tableController = {
  async listTables(request: FastifyRequest, reply: FastifyReply) {
    const tables = await tableService.listTables(
      request.authenticatedUser,
      request.headers["x-qr-token"] as string | undefined,
      request.query as ListTablesQuery
    );
    return sendSuccess(request, reply, tables);
  },

  async createTable(request: FastifyRequest, reply: FastifyReply) {
    const actor = getActor(request);
    const data = validate(createTableSchema, request.body);
    // tenantId is not part of the schema; read it from the raw body as before
    const requestedTenantId = (request.body as { tenantId?: string } | undefined)?.tenantId;
    const table = await tableService.createTable(actor, data, requestedTenantId);
    return sendSuccess(request, reply, table, 201, "Dining table created successfully");
  },

  async getTable(request: FastifyRequest, reply: FastifyReply) {
    const { id } = validate(tableIdParamSchema, request.params);
    const table = await tableService.getTable(request.authenticatedUser, id);
    return sendSuccess(request, reply, table);
  },

  async updateTable(request: FastifyRequest, reply: FastifyReply) {
    const actor = getActor(request);
    const { id } = validate(tableIdParamSchema, request.params);
    // Lookup and permission check intentionally run before body validation
    const existing = await tableService.getUpdatableTable(actor, id);
    const data = validate(updateTableSchema, request.body);
    const table = await tableService.updateTable(actor, existing, data);
    return sendSuccess(request, reply, table, 200, "Table updated successfully");
  },

  async updateTableStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id } = validate(tableIdParamSchema, request.params);
    const { status } = request.body as { status: string };
    const table = await tableService.updateTableStatus(id, status);
    return sendSuccess(request, reply, table, 200, "Table status updated");
  },

  async rotateQr(request: FastifyRequest, reply: FastifyReply) {
    const actor = getActor(request);
    const { id } = validate(tableIdParamSchema, request.params);
    const result = await tableService.rotateQr(actor, id);
    return sendSuccess(request, reply, result, 200, "Table QR code token rotated successfully");
  },

  async deactivateTable(request: FastifyRequest, reply: FastifyReply) {
    const actor = getActor(request);
    const { id } = validate(tableIdParamSchema, request.params);
    await tableService.deactivateTable(actor, id);
    return sendSuccess(request, reply, null, 200, "Dining table deactivated successfully");
  },
};
