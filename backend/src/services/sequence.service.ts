import type { DbClient } from "../database/prisma.js";
import { sequenceModel } from "../models/sequence.model.js";
import type { CounterType } from "../types/order.types.js";

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
    counterType: CounterType,
    tx?: DbClient,
    targetDate?: string
  ): Promise<{ dateStr: string; counter: number }> {
    const dateStr = targetDate || this.getFormattedDate();
    const rows = await sequenceModel.incrementDailyCounter(tenantId, dateStr, counterType, tx);

    const counter = Number(rows[0]?.counter ?? 1);
    return { dateStr, counter };
  }

  /**
   * Allocate human-readable order number: ORD-YYYYMMDD-XXXX (e.g. ORD-20261011-0001)
   */
  async allocateOrderNumber(
    tenantId: string,
    tx?: DbClient
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
    tx?: DbClient
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
    tx?: DbClient
  ): Promise<string> {
    const { dateStr, counter } = await this.getNextCounter(tenantId, "INVOICE", tx);
    const padded = String(counter).padStart(4, "0");
    return `INV-${dateStr}-${padded}`;
  }
}

export const sequenceService = new SequenceService();
