import { Prisma } from "@prisma/client";
import { prisma, type DbClient } from "../database/prisma.js";
import type { CounterType } from "../types/order.types.js";

export const sequenceModel = {
  /**
   * Atomically increment (or create at 1) the daily counter and return its new value.
   * Concurrency-safe: uses PostgreSQL row lock via ON CONFLICT DO UPDATE.
   */
  incrementDailyCounter(
    tenantId: string,
    dateStr: string,
    counterType: CounterType,
    db: DbClient = prisma
  ) {
    return db.$queryRaw<Array<{ counter: number }>>(
      Prisma.sql`
        INSERT INTO "daily_counters" ("id", "tenant_id", "date", "counter_type", "counter", "created_at", "updated_at")
        VALUES (gen_random_uuid(), ${tenantId}::uuid, ${dateStr}, ${counterType}, 1, now(), now())
        ON CONFLICT ("tenant_id", "date", "counter_type")
        DO UPDATE SET "counter" = "daily_counters"."counter" + 1, "updated_at" = now()
        RETURNING "counter";
      `
    );
  },
};
