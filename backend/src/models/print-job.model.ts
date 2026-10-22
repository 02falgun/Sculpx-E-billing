import { Prisma, PrintJobStatus } from "@prisma/client";
import { prisma, type DbClient } from "../database/prisma.js";
import type { PrintJobFilter } from "../types/print-job.types.js";

const listPrinterSelect = {
  id: true,
  name: true,
  type: true,
  station: true,
  location: true,
  paperWidthMm: true,
  isOnline: true,
} satisfies Prisma.PrinterSelect;

function toWhere(tenantId: string, filter: PrintJobFilter): Prisma.PrintJobWhereInput {
  return {
    tenantId,
    ...(filter.status ? { status: filter.status } : {}),
    ...(filter.printerId ? { printerId: filter.printerId } : {}),
    ...(filter.jobType ? { jobType: filter.jobType } : {}),
  };
}

export const printJobModel = {
  findById(id: string, db: DbClient = prisma) {
    return db.printJob.findUnique({ where: { id }, include: { printer: true } });
  },

  findByIdempotencyKey(tenantId: string, idempotencyKey: string, db: DbClient = prisma) {
    return db.printJob.findFirst({ where: { tenantId, idempotencyKey } });
  },

  /** A QUEUED or PRINTING job for the same printer, type and business reference. */
  findInFlightForReference(
    tenantId: string,
    printerId: string,
    jobType: string,
    referenceId: string,
    db: DbClient = prisma
  ) {
    return db.printJob.findFirst({
      where: {
        tenantId,
        printerId,
        jobType,
        referenceId,
        status: { in: [PrintJobStatus.QUEUED, PrintJobStatus.PRINTING] },
      },
    });
  },

  async findPage(tenantId: string, filter: PrintJobFilter, take: number, skip: number, db: DbClient = prisma) {
    const where = toWhere(tenantId, filter);
    const [total, data] = await Promise.all([
      db.printJob.count({ where }),
      db.printJob.findMany({
        where,
        include: { printer: { select: listPrinterSelect } },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
    return { total, data };
  },

  countByPrinter(printerId: string, db: DbClient = prisma) {
    return db.printJob.count({ where: { printerId } });
  },

  countByStatus(tenantId: string, db: DbClient = prisma) {
    return db.printJob.groupBy({
      by: ["status"],
      where: { tenantId },
      _count: { id: true },
    });
  },

  create(data: Prisma.PrintJobUncheckedCreateInput, db: DbClient = prisma) {
    return db.printJob.create({ data, include: { printer: true } });
  },

  /** Like `create`, but without the printer include. */
  createWithoutPrinter(data: Prisma.PrintJobUncheckedCreateInput, db: DbClient = prisma) {
    return db.printJob.create({ data });
  },

  update(id: string, data: Prisma.PrintJobUncheckedUpdateInput, db: DbClient = prisma) {
    return db.printJob.update({ where: { id }, data, include: { printer: true } });
  },

  /** Flag PRINTING jobs not touched since `staleThreshold` as UNCERTAIN. */
  markStalePrintingUncertain(staleThreshold: Date, errorMessage: string, db: DbClient = prisma) {
    return db.printJob.updateMany({
      where: {
        status: PrintJobStatus.PRINTING,
        updatedAt: { lt: staleThreshold },
      },
      data: {
        status: PrintJobStatus.UNCERTAIN,
        errorMessage,
      },
    });
  },

  /** Lock up to `batchSize` due QUEUED job IDs with `FOR UPDATE SKIP LOCKED`. */
  lockDueQueuedIds(batchSize: number, db: DbClient = prisma) {
    return db.$queryRaw<{ id: string }[]>`
          SELECT id FROM print_jobs
          WHERE status = 'QUEUED'
            AND (next_retry_at IS NULL OR next_retry_at <= NOW())
          ORDER BY created_at ASC
          LIMIT ${batchSize}
          FOR UPDATE SKIP LOCKED
        `;
  },

  markPrinting(ids: string[], db: DbClient = prisma) {
    return db.printJob.updateMany({
      where: { id: { in: ids } },
      data: { status: PrintJobStatus.PRINTING },
    });
  },

  findManyByIds(ids: string[], db: DbClient = prisma) {
    return db.printJob.findMany({
      where: { id: { in: ids } },
      include: { printer: true },
      orderBy: { createdAt: "asc" },
    });
  },
};
