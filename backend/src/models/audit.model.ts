import type { Prisma } from "@prisma/client";
import { prisma, type DbClient } from "../database/prisma.js";
import type { AuditLogFilter } from "../types/audit.types.js";

function toWhere(filter: AuditLogFilter): Prisma.AuditLogWhereInput {
  return {
    ...(filter.tenantId ? { tenantId: filter.tenantId } : {}),
    ...(filter.action ? { action: filter.action } : {}),
    ...(filter.resource ? { resource: filter.resource } : {}),
  };
}

export const auditModel = {
  create(data: Prisma.AuditLogUncheckedCreateInput, db: DbClient = prisma) {
    return db.auditLog.create({ data });
  },

  async findPage(filter: AuditLogFilter, take: number, skip: number, db: DbClient = prisma) {
    const where = toWhere(filter);
    const [logs, total] = await Promise.all([
      db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, take, skip }),
      db.auditLog.count({ where }),
    ]);
    return { logs, total };
  },
};
