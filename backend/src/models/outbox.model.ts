import { type Prisma, OutboxStatus } from "@prisma/client";
import { prisma, type DbClient } from "../database/prisma.js";

export const outboxModel = {
  findById(id: string, db: DbClient = prisma) {
    return db.outboxEvent.findUnique({ where: { id } });
  },

  findManyByIds(ids: string[], db: DbClient = prisma) {
    return db.outboxEvent.findMany({
      where: { id: { in: ids } },
      orderBy: { createdAt: "asc" },
    });
  },

  findPending(take: number, db: DbClient = prisma) {
    return db.outboxEvent.findMany({
      where: { status: OutboxStatus.PENDING },
      orderBy: { createdAt: "asc" },
      take,
    });
  },

  findFailed(tenantId: string | undefined, take: number, db: DbClient = prisma) {
    return db.outboxEvent.findMany({
      where: {
        status: OutboxStatus.FAILED,
        ...(tenantId ? { tenantId } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take,
    });
  },

  create(data: Prisma.OutboxEventUncheckedCreateInput, db: DbClient = prisma) {
    return db.outboxEvent.create({ data });
  },

  update(id: string, data: Prisma.OutboxEventUncheckedUpdateInput, db: DbClient = prisma) {
    return db.outboxEvent.update({ where: { id }, data });
  },

  setStatusForIds(ids: string[], status: OutboxStatus, db: DbClient = prisma) {
    return db.outboxEvent.updateMany({
      where: { id: { in: ids } },
      data: { status },
    });
  },

  /** Return PROCESSING events not updated since `threshold` to PENDING. */
  resetStaleProcessing(threshold: Date, db: DbClient = prisma) {
    return db.outboxEvent.updateMany({
      where: {
        status: OutboxStatus.PROCESSING,
        updatedAt: { lt: threshold },
      },
      data: {
        status: OutboxStatus.PENDING,
      },
    });
  },

  /** Lock pending event ids with `FOR UPDATE SKIP LOCKED` (run inside a transaction). */
  lockPendingIds(batchSize: number, db: DbClient = prisma) {
    return db.$queryRaw<{ id: string }[]>`
      SELECT id FROM outbox_events
      WHERE status = 'PENDING'
      ORDER BY created_at ASC
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    `;
  },

  countByStatus(tenantId: string | undefined, status: OutboxStatus, db: DbClient = prisma) {
    const where = tenantId ? { tenantId } : {};
    return db.outboxEvent.count({ where: { ...where, status } });
  },
};
