import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export class SequenceService {
  /**
   * Get formatted local date string in YYYYMMDD format.
   * Uses Asia/Kolkata (IST) timezone per business rules, or fallback to UTC.
   */
  getFormattedDate(date: Date = new Date()): string {
    try {
      const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      // formatted is YYYY-MM-DD
      const parts = formatter.format(date).split("-");
      return parts.join(""); // "YYYYMMDD"
    } catch {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, "0");
      const d = String(date.getUTCDate()).padStart(2, "0");
      return `${y}${m}${d}`;
    }
  }

  /**
   * Atomically allocate next sequential integer counter for a tenant, date, and counter type.
   * Concurrency-safe: uses PostgreSQL row lock via ON CONFLICT DO UPDATE.
   */
  async getNextCounter(
    tenantId: string,
    counterType: "ORDER" | "KOT" | "INVOICE",
    tx?: Prisma.TransactionClient | PrismaClient,
    targetDate?: string
  ): Promise<{ dateStr: string; counter: number }> {
    const db = tx || prisma;
    const dateStr = targetDate || this.getFormattedDate();

    // Use atomic upsert with RETURNING in raw PostgreSQL
    const rows = await db.$queryRaw<Array<{ counter: number }>>(
      Prisma.sql`
        INSERT INTO "daily_counters" ("id", "tenant_id", "date", "counter_type", "counter", "created_at", "updated_at")
        VALUES (gen_random_uuid(), ${tenantId}::uuid, ${dateStr}, ${counterType}, 1, now(), now())
        ON CONFLICT ("tenant_id", "date", "counter_type")
        DO UPDATE SET "counter" = "daily_counters"."counter" + 1, "updated_at" = now()
        RETURNING "counter";
      `
    );

    const counter = Number(rows[0]?.counter ?? 1);
    return { dateStr, counter };
  }

  /**
   * Allocate human-readable order number: ORD-YYYYMMDD-XXXX (e.g. ORD-20261011-0001)
   */
  async allocateOrderNumber(
    tenantId: string,
    tx?: Prisma.TransactionClient | PrismaClient
  ): Promise<string> {
    const { dateStr, counter } = await this.getNextCounter(tenantId, "ORDER", tx);
    const padded = String(counter).padStart(4, "0");
    return `ORD-${dateStr}-${padded}`;
  }

  /**
   * Allocate human-readable KOT number: KOT-YYYYMMDD-XXXX (e.g. KOT-20261011-0001)
   */
  async allocateKotNumber(
    tenantId: string,
    tx?: Prisma.TransactionClient | PrismaClient
  ): Promise<string> {
    const { dateStr, counter } = await this.getNextCounter(tenantId, "KOT", tx);
    const padded = String(counter).padStart(4, "0");
    return `KOT-${dateStr}-${padded}`;
  }

  /**
   * Allocate human-readable invoice number: INV-YYYYMMDD-XXXX (e.g. INV-20261011-0001)
   */
  async allocateInvoiceNumber(
    tenantId: string,
    tx?: Prisma.TransactionClient | PrismaClient
  ): Promise<string> {
    const { dateStr, counter } = await this.getNextCounter(tenantId, "INVOICE", tx);
    const padded = String(counter).padStart(4, "0");
    return `INV-${dateStr}-${padded}`;
  }
}

export const sequenceService = new SequenceService();
