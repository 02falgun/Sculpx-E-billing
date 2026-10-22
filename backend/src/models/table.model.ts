import { TableStatus, type Prisma } from "@prisma/client";
import { prisma, type DbClient } from "../database/prisma.js";
import type { TableListFilter } from "../types/table.types.js";

const activeQrInclude = {
  qrCodes: {
    where: { isActive: true },
    orderBy: { createdAt: "desc" as const },
  },
};

export const tableModel = {
  findById(id: string, db: DbClient = prisma) {
    return db.table.findUnique({ where: { id } });
  },

  findByIdWithActiveQr(id: string, db: DbClient = prisma) {
    return db.table.findUnique({ where: { id }, include: activeQrInclude });
  },

  findByNumber(tenantId: string, tableNumber: string, db: DbClient = prisma) {
    return db.table.findUnique({ where: { tenantId_tableNumber: { tenantId, tableNumber } } });
  },

  findManyForTenant(tenantId: string, filter: TableListFilter, db: DbClient = prisma) {
    return db.table.findMany({
      where: {
        tenantId,
        ...(filter.includeInactive ? {} : { isActive: true }),
        ...(filter.section ? { section: filter.section } : {}),
      },
      include: activeQrInclude,
      orderBy: { tableNumber: "asc" },
    });
  },

  create(data: Prisma.TableUncheckedCreateInput, db: DbClient = prisma) {
    return db.table.create({ data });
  },

  updateWithActiveQr(id: string, data: Prisma.TableUncheckedUpdateInput, db: DbClient = prisma) {
    return db.table.update({ where: { id }, data, include: activeQrInclude });
  },

  deactivate(id: string, db: DbClient = prisma) {
    return db.table.update({
      where: { id },
      data: { isActive: false, status: TableStatus.VACANT },
    });
  },

  /** Attach the order to its table and flip a VACANT table to OCCUPIED. */
  attachOrder(tableId: string, orderId: string, wasVacant: boolean, db: DbClient = prisma) {
    return db.table.update({
      where: { id: tableId },
      data: {
        currentOrderId: orderId,
        status: wasVacant ? TableStatus.OCCUPIED : undefined,
      },
    });
  },

  markBillRequested(tableId: string, db: DbClient = prisma) {
    return db.table.update({
      where: { id: tableId },
      data: { status: TableStatus.BILL_REQUESTED },
    });
  },

  /** Free the table: VACANT with no current order. */
  release(tableId: string, db: DbClient = prisma) {
    return db.table.update({
      where: { id: tableId },
      data: { status: TableStatus.VACANT, currentOrderId: null },
    });
  },
};
