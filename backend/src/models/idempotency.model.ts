import type { Prisma } from "@prisma/client";
import { prisma, type DbClient } from "../database/prisma.js";

export const idempotencyModel = {
  findByKey(tenantId: string, key: string, endpoint: string, db: DbClient = prisma) {
    return db.idempotencyKey.findUnique({
      where: {
        tenantId_key_endpoint: {
          tenantId,
          key,
          endpoint,
        },
      },
    });
  },

  create(data: Prisma.IdempotencyKeyUncheckedCreateInput, db: DbClient = prisma) {
    return db.idempotencyKey.create({ data });
  },

  update(id: string, data: Prisma.IdempotencyKeyUncheckedUpdateInput, db: DbClient = prisma) {
    return db.idempotencyKey.update({ where: { id }, data });
  },

  delete(id: string, db: DbClient = prisma) {
    return db.idempotencyKey.delete({ where: { id } });
  },
};
