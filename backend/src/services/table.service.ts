import crypto from "node:crypto";
import { TableStatus, type Table } from "@prisma/client";
import { withTransaction } from "../database/prisma.js";
import { BadRequestError, ConflictError, ForbiddenError, UnauthorizedError } from "../lib/errors.js";
import { ErrorCode } from "../constants/error-codes.js";
import { ensureFound, assertTenantAccess } from "../lib/guards.js";
import type { ActorContext, AuthenticatedUser } from "../types/auth.types.js";
import type { ListTablesQuery, TableWithQrCodes } from "../types/table.types.js";
import { tableModel } from "../models/table.model.js";
import { qrModel } from "../models/qr.model.js";
import { auditService } from "./audit.service.js";
import type { CreateTableInput, UpdateTableInput } from "../validations/table.validation.js";

function formatTable(t: TableWithQrCodes) {
  return {
    id: t.id,
    tenantId: t.tenantId,
    tableNumber: t.tableNumber,
    displayName: t.displayName,
    section: t.section,
    capacity: t.capacity,
    status: t.status === "VACANT" ? "AVAILABLE" : t.status,
    isActive: t.isActive,
    qrToken: t.qrCodes[0]?.token || "",
    activeOrderId: t.currentOrderId || undefined,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

async function getOwnedTable(actor: ActorContext, id: string) {
  const table = ensureFound(await tableModel.findById(id), "Table not found");
  assertTenantAccess(actor, table.tenantId);
  return table;
}

export const tableService = {
  async listTables(user: AuthenticatedUser | undefined, qrToken: string | undefined, query: ListTablesQuery) {
    let tenantId = user?.tenantId;

    if (!tenantId && qrToken) {
      // Unauthenticated customer: resolve the tenant from the QR header
      const qr = await qrModel.findByToken(qrToken);
      if (qr) tenantId = qr.tenantId;
    }

    if (!tenantId) {
      throw new UnauthorizedError("Authentication or valid QR token context required");
    }

    const tables = await tableModel.findManyForTenant(tenantId, {
      includeInactive: query?.includeInactive === "true",
      section: query?.section,
    });

    return tables.map(formatTable);
  },

  async createTable(actor: ActorContext, data: CreateTableInput, requestedTenantId: string | undefined) {
    const caller = actor.user;
    const targetTenantId = requestedTenantId || caller.tenantId;

    if (await tableModel.findByNumber(targetTenantId, data.tableNumber)) {
      throw new ConflictError(`Table number '${data.tableNumber}' already exists in your restaurant`, ErrorCode.TABLE_EXISTS);
    }

    const qrToken = `tbl-${caller.tenantId.slice(0, 6)}-${data.tableNumber.toLowerCase()}-${crypto.randomBytes(4).toString("hex")}`;

    const { table, qr } = await withTransaction(async (tx) => {
      const t = await tableModel.create(
        {
          tenantId: targetTenantId,
          tableNumber: data.tableNumber,
          displayName: data.displayName,
          capacity: data.capacity,
          section: data.section,
          status: TableStatus.VACANT,
          isActive: true,
        },
        tx
      );
      const q = await qrModel.createForTable(caller.tenantId, t.id, qrToken, tx);
      return { table: t, qr: q };
    });

    await auditService.recordAction(actor, {
      action: "TABLE_CREATED",
      resource: "tables",
      resourceId: table.id,
      details: { tableNumber: table.tableNumber, capacity: table.capacity, section: table.section },
    });

    return {
      id: table.id,
      tenantId: table.tenantId,
      tableNumber: table.tableNumber,
      displayName: table.displayName,
      section: table.section,
      capacity: table.capacity,
      status: "AVAILABLE",
      isActive: table.isActive,
      qrToken: qr.token,
      createdAt: table.createdAt.toISOString(),
      updatedAt: table.updatedAt.toISOString(),
    };
  },

  async getTable(user: AuthenticatedUser | undefined, id: string) {
    const table = ensureFound(await tableModel.findByIdWithActiveQr(id), "Table not found");

    if (user && user.role !== "SUPER_ADMIN" && user.tenantId !== table.tenantId) {
      throw new ForbiddenError("Forbidden: cross-tenant access denied");
    }

    return formatTable(table);
  },

  /**
   * Lookup + permission check for updates; runs before body validation
   * so 404/403 take precedence over 400.
   */
  async getUpdatableTable(actor: ActorContext, id: string) {
    return getOwnedTable(actor, id);
  },

  async updateTable(actor: ActorContext, existing: Table, data: UpdateTableInput) {
    const id = existing.id;

    if (
      data.tableNumber &&
      data.tableNumber !== existing.tableNumber &&
      (await tableModel.findByNumber(existing.tenantId, data.tableNumber))
    ) {
      throw new ConflictError(`Table number '${data.tableNumber}' is already in use`, ErrorCode.TABLE_EXISTS);
    }

    const updated = await tableModel.updateWithActiveQr(id, {
      ...(data.tableNumber ? { tableNumber: data.tableNumber } : {}),
      ...(data.displayName ? { displayName: data.displayName } : {}),
      ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
      ...(data.section ? { section: data.section } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    });

    await auditService.recordAction(actor, {
      tenantId: existing.tenantId,
      action: "TABLE_UPDATED",
      resource: "tables",
      resourceId: id,
      details: data,
    });

    return formatTable(updated);
  },

  async updateTableStatus(id: string, status: string) {
    const prismaStatus = status === "AVAILABLE" ? TableStatus.VACANT : (status as TableStatus);
    const updated = await tableModel.updateWithActiveQr(id, { status: prismaStatus });
    return formatTable(updated);
  },

  async rotateQr(actor: ActorContext, id: string) {
    const table = await getOwnedTable(actor, id);

    const newToken = `tbl-${table.tenantId.slice(0, 6)}-${table.tableNumber.toLowerCase()}-${crypto.randomBytes(6).toString("hex")}`;

    const newQr = await withTransaction(async (tx) => {
      await qrModel.deactivateForTable(id, tx);
      return qrModel.createForTable(table.tenantId, id, newToken, tx);
    });

    await auditService.recordAction(actor, {
      tenantId: table.tenantId,
      action: "QR_TOKEN_ROTATED",
      resource: "tables",
      resourceId: id,
      details: { tableNumber: table.tableNumber, newQrId: newQr.id },
    });

    return { tableId: id, qrToken: newQr.token };
  },

  async deactivateTable(actor: ActorContext, id: string): Promise<void> {
    const table = await getOwnedTable(actor, id);

    if (table.status === TableStatus.OCCUPIED || table.currentOrderId) {
      throw new BadRequestError("Cannot deactivate table while it is currently occupied with active dining sessions", ErrorCode.TABLE_OCCUPIED);
    }

    await withTransaction(async (tx) => {
      await tableModel.deactivate(id, tx);
      await qrModel.deactivateForTable(id, tx);
    });

    await auditService.recordAction(actor, {
      tenantId: table.tenantId,
      action: "TABLE_DEACTIVATED",
      resource: "tables",
      resourceId: id,
      details: { tableNumber: table.tableNumber },
    });
  },
};
