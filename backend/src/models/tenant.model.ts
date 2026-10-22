import type { Prisma } from "@prisma/client";
import { prisma, type DbClient } from "../database/prisma.js";

export const tenantModel = {
  findAll(db: DbClient = prisma) {
    return db.tenant.findMany({ orderBy: { createdAt: "desc" } });
  },

  findById(id: string, db: DbClient = prisma) {
    return db.tenant.findUnique({ where: { id } });
  },

  findByCode(code: string, db: DbClient = prisma) {
    return db.tenant.findUnique({ where: { code } });
  },

  create(data: Prisma.TenantUncheckedCreateInput, db: DbClient = prisma) {
    return db.tenant.create({ data });
  },

  update(id: string, data: Prisma.TenantUncheckedUpdateInput, db: DbClient = prisma) {
    return db.tenant.update({ where: { id }, data });
  },

  upsert(
    id: string,
    create: Prisma.TenantUncheckedCreateInput,
    update: Prisma.TenantUncheckedUpdateInput,
    db: DbClient = prisma
  ) {
    return db.tenant.upsert({ where: { id }, create, update });
  },

  /** Active setup counts used by the readiness checklist. */
  async countActiveSetup(tenantId: string, db: DbClient = prisma) {
    const [tablesCount, roomsCount, menuCategoriesCount, menuItemsCount, staffCount] =
      await Promise.all([
        db.table.count({ where: { tenantId, isActive: true } }),
        db.room.count({ where: { tenantId, isActive: true } }),
        db.menuCategory.count({ where: { tenantId, isActive: true } }),
        db.menuItem.count({ where: { category: { tenantId }, isAvailable: true } }),
        db.user.count({ where: { tenantId, isActive: true } }),
      ]);
    return { tablesCount, roomsCount, menuCategoriesCount, menuItemsCount, staffCount };
  },

  findBillingSettings(tenantId: string, db: DbClient = prisma) {
    return db.tenant.findUnique({
      where: { id: tenantId },
      select: {
        cgstRate: true,
        sgstRate: true,
        serviceChargeRate: true,
        gstin: true,
        settings: true,
      },
    });
  },
};
