import { Prisma, type OutboxEvent, OutboxStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

export type OutboxDispatcher = (event: OutboxEvent) => Promise<void>;

export class OutboxService {
  private customDispatcher: OutboxDispatcher | null = null;

  /**
   * Set a custom event dispatcher (e.g. for testing or WebSocket transport hook).
   */
  setDispatcher(dispatcher: OutboxDispatcher | null): void {
    this.customDispatcher = dispatcher;
  }

  /**
   * Record a transactional outbox event inside a database transaction.
   * Guarantees event is persisted atomically with the business data.
   */
  async createEvent(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      eventType: string;
      topic: string;
      payload: Record<string, unknown>;
    }
  ): Promise<OutboxEvent> {
    return tx.outboxEvent.create({
      data: {
        tenantId: params.tenantId,
        eventType: params.eventType,
        topic: params.topic,
        payload: params.payload as any,
        status: OutboxStatus.PENDING,
      },
    });
  }

  /**
   * Safely dispatch a single outbox event.
   * Updates delivery status in the database.
   */
  async dispatchEvent(eventId: string): Promise<boolean> {
    const event = await prisma.outboxEvent.findUnique({
      where: { id: eventId },
    });

    if (!event || event.status === OutboxStatus.PUBLISHED) {
      return true;
    }

    try {
      if (this.customDispatcher) {
        await this.customDispatcher(event);
      } else {
        // Default transport logging when no WebSocket daemon is active
        logger.info({
          msg: "Outbox event dispatched",
          eventId: event.id,
          eventType: event.eventType,
          topic: event.topic,
          tenantId: event.tenantId,
        });
      }

      await prisma.outboxEvent.update({
        where: { id: eventId },
        data: {
          status: OutboxStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });

      return true;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.warn({
        msg: "Failed to dispatch outbox event",
        eventId: event.id,
        error: errMsg,
        retryCount: event.retryCount + 1,
      });

      const nextRetry = event.retryCount + 1;
      await prisma.outboxEvent.update({
        where: { id: eventId },
        data: {
          status: nextRetry >= 5 ? OutboxStatus.FAILED : OutboxStatus.PENDING,
          retryCount: nextRetry,
          lastError: errMsg,
        },
      });

      return false;
    }
  }

  /**
   * Background sweep worker to process pending outbox events.
   */
  async processPendingEvents(batchSize = 20): Promise<{ processed: number; succeeded: number }> {
    const pending = await prisma.outboxEvent.findMany({
      where: { status: OutboxStatus.PENDING },
      orderBy: { createdAt: "asc" },
      take: batchSize,
    });

    let succeeded = 0;
    for (const ev of pending) {
      const ok = await this.dispatchEvent(ev.id);
      if (ok) succeeded++;
    }

    return { processed: pending.length, succeeded };
  }
}

export const outboxService = new OutboxService();
