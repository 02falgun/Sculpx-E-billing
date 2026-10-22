import type { Prisma, PrinterType } from "@prisma/client";
import { prisma, type DbClient } from "../database/prisma.js";
import type { PrinterFilter } from "../types/printer.types.js";

export const printerModel = {
  findById(id: string, db: DbClient = prisma) {
    return db.printer.findUnique({ where: { id } });
  },

  findManyForTenant(tenantId: string, filter: PrinterFilter = {}, db: DbClient = prisma) {
    const where: Prisma.PrinterWhereInput = {
      tenantId,
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.station ? { station: filter.station } : {}),
      ...(filter.isActive !== undefined ? { isActive: filter.isActive } : {}),
    };
    return db.printer.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
  },

  findActiveByStation(tenantId: string, station: string, db: DbClient = prisma) {
    return db.printer.findFirst({
      where: { tenantId, isActive: true, station: { equals: station, mode: "insensitive" } },
    });
  },

  /** Default active printer for a kitchen station (or any KITCHEN printer). */
  findKitchenForStation(tenantId: string, station: string, db: DbClient = prisma) {
    return db.printer.findFirst({
      where: {
        tenantId,
        isActive: true,
        OR: [{ station }, { type: "KITCHEN" }],
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });
  },

  findActiveDefaultOfType(tenantId: string, type: PrinterType, db: DbClient = prisma) {
    return db.printer.findFirst({ where: { tenantId, type, isActive: true, isDefault: true } });
  },

  findActiveOfType(tenantId: string, type: PrinterType, db: DbClient = prisma) {
    return db.printer.findFirst({ where: { tenantId, type, isActive: true } });
  },

  findAnyActive(tenantId: string, db: DbClient = prisma) {
    return db.printer.findFirst({ where: { tenantId, isActive: true } });
  },

  findManyByIdsInTenant(tenantId: string, ids: string[], db: DbClient = prisma) {
    return db.printer.findMany({ where: { tenantId, id: { in: ids } } });
  },

  countByIdsInTenant(tenantId: string, ids: string[], db: DbClient = prisma) {
    return db.printer.count({ where: { tenantId, id: { in: ids } } });
  },

  /** Count of the tenant's active printers, optionally filtered by online state. */
  countActive(tenantId: string, isOnline?: boolean, db: DbClient = prisma) {
    return db.printer.count({
      where: { tenantId, isActive: true, ...(isOnline !== undefined ? { isOnline } : {}) },
    });
  },

  create(data: Prisma.PrinterUncheckedCreateInput, db: DbClient = prisma) {
    return db.printer.create({ data });
  },

  update(id: string, data: Prisma.PrinterUncheckedUpdateInput, db: DbClient = prisma) {
    return db.printer.update({ where: { id }, data });
  },

  delete(id: string, db: DbClient = prisma) {
    return db.printer.delete({ where: { id } });
  },

  /** Unset `isDefault` on the tenant's other default printers of `type`. */
  clearDefaults(tenantId: string, type: PrinterType, exceptId?: string, db: DbClient = prisma) {
    return db.printer.updateMany({
      where: {
        tenantId,
        type,
        isDefault: true,
        ...(exceptId !== undefined ? { id: { not: exceptId } } : {}),
      },
      data: { isDefault: false },
    });
  },

  updateManyByIds(ids: string[], data: Prisma.PrinterUncheckedUpdateManyInput, db: DbClient = prisma) {
    return db.printer.updateMany({ where: { id: { in: ids } }, data });
  },

  updateManyByAgent(agentId: string, data: Prisma.PrinterUncheckedUpdateManyInput, db: DbClient = prisma) {
    return db.printer.updateMany({ where: { agentId }, data });
  },
};
