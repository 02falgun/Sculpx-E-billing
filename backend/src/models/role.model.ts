import type { Prisma } from "@prisma/client";
import { prisma, type DbClient } from "../database/prisma.js";

export const roleModel = {
  findById(id: string, db: DbClient = prisma) {
    return db.customRole.findUnique({ where: { id } });
  },

  findByName(tenantId: string, name: string, db: DbClient = prisma) {
    return db.customRole.findUnique({ where: { tenantId_name: { tenantId, name } } });
  },

  /** All custom roles, or only one tenant's when `tenantId` is given. */
  findMany(tenantId?: string, db: DbClient = prisma) {
    return db.customRole.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: { createdAt: "desc" },
    });
  },

  create(data: Prisma.CustomRoleUncheckedCreateInput, db: DbClient = prisma) {
    return db.customRole.create({ data });
  },

  update(id: string, data: Prisma.CustomRoleUncheckedUpdateInput, db: DbClient = prisma) {
    return db.customRole.update({ where: { id }, data });
  },

  delete(id: string, db: DbClient = prisma) {
    return db.customRole.delete({ where: { id } });
  },
};
