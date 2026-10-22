import { KotStatus, type Prisma } from "@prisma/client";
import { prisma, type DbClient } from "../database/prisma.js";

const kotDetailInclude = {
  order: {
    include: {
      table: true,
      room: true,
    },
  },
  items: {
    include: {
      orderItem: true,
    },
  },
} satisfies Prisma.KotInclude;

export const kotModel = {
  findActiveForTenant(tenantId: string, station: string | undefined, db: DbClient = prisma) {
    return db.kot.findMany({
      where: {
        order: { tenantId },
        status: {
          notIn: [KotStatus.SERVED, KotStatus.CANCELLED],
        },
        ...(station ? { station } : {}),
      },
      include: kotDetailInclude,
      orderBy: { createdAt: "asc" },
    });
  },

  findByIdWithDetails(id: string, db: DbClient = prisma) {
    return db.kot.findUnique({ where: { id }, include: kotDetailInclude });
  },

  /** Row-locks the KOT (`SELECT ... FOR UPDATE`); call inside a transaction. */
  async lockById(id: string, db: DbClient = prisma) {
    const [locked] = await db.$queryRaw<Array<{ id: string; status: KotStatus }>>`
      SELECT id, status FROM kots WHERE id = ${id}::uuid FOR UPDATE
    `;
    return locked;
  },

  updateWithDetails(id: string, data: Prisma.KotUpdateInput, db: DbClient = prisma) {
    return db.kot.update({ where: { id }, data, include: kotDetailInclude });
  },

  findStatusesForOrder(orderId: string, db: DbClient = prisma) {
    return db.kot.findMany({
      where: { orderId },
      select: { id: true, status: true },
    });
  },

  create(data: Prisma.KotUncheckedCreateInput, db: DbClient = prisma) {
    return db.kot.create({ data });
  },

  createItem(data: Prisma.KotItemUncheckedCreateInput, db: DbClient = prisma) {
    return db.kotItem.create({ data });
  },
};
