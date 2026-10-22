import type { Prisma } from "@prisma/client";
import { prisma, type DbClient } from "../database/prisma.js";

const listPrinterSelect = {
  id: true,
  name: true,
  type: true,
  station: true,
  isOnline: true,
} satisfies Prisma.PrinterSelect;

export const printAgentModel = {
  findById(id: string, db: DbClient = prisma) {
    return db.printAgent.findUnique({ where: { id }, include: { printers: true } });
  },

  findByDeviceId(deviceId: string, db: DbClient = prisma) {
    return db.printAgent.findUnique({ where: { deviceId } });
  },

  findByDeviceIdWithPrinters(deviceId: string, db: DbClient = prisma) {
    return db.printAgent.findUnique({ where: { deviceId }, include: { printers: true } });
  },

  findManyForTenant(tenantId: string, db: DbClient = prisma) {
    return db.printAgent.findMany({
      where: { tenantId },
      include: { printers: { select: listPrinterSelect } },
      orderBy: { createdAt: "desc" },
    });
  },

  create(data: Prisma.PrintAgentUncheckedCreateInput, db: DbClient = prisma) {
    return db.printAgent.create({ data });
  },

  update(id: string, data: Prisma.PrintAgentUncheckedUpdateInput, db: DbClient = prisma) {
    return db.printAgent.update({ where: { id }, data });
  },

  updateWithPrinters(id: string, data: Prisma.PrintAgentUncheckedUpdateInput, db: DbClient = prisma) {
    return db.printAgent.update({ where: { id }, data, include: { printers: true } });
  },
};
