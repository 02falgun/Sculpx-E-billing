import { Prisma, type OutboxEvent, OutboxStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { websocketService } from "./websocket.service.js";

export type OutboxDispatcher = (event: OutboxEvent) => Promise<void>;

export class OutboxService {
  private customDispatcher: OutboxDispatcher | null = null;
  private workerTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  /**
   * Maximum allowed retry attempts before an event transitions to FAILED.
   */
  public readonly MAX_RETRIES = 5;

  /**
   * Set a custom event dispatcher (e.g. for testing).
   */
  setDispatcher(dispatcher: OutboxDispatcher | null): void {
    this.customDispatcher = dispatcher;
  }

  /**
   * Calculate exponential backoff delay in milliseconds.
   * e.g.: retry 0 -> 1000ms, retry 1 -> 2000ms, retry 2 -> 4000ms, capped at 30,000ms.
   */
  calculateBackoffMs(retryCount: number): number {
    return Math.min(1000 * Math.pow(2, retryCount), 30000);
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
   * Dispatches via customDispatcher or default WebSocketService broadcaster.
   * Handles bounded retries, exponential backoff, and failure recording.
   *
   * Crucial guarantee: WebSocket failures CANNOT invalidate business transactions,
   * because this runs post-commit.
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
        // Default transport: Broadcast over Fastify WebSocket server to subscribers
        websocketService.broadcastEvent({
          tenantId: event.tenantId,
          eventType: event.eventType,
          topic: event.topic,
          payload: (event.payload as Record<string, unknown>) || {},
        });

        logger.info({
          msg: "Outbox event dispatched via WebSocket transport",
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
          lastError: null,
        },
      });

      return true;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const nextRetry = event.retryCount + 1;
      const isExhausted = nextRetry >= this.MAX_RETRIES;

      logger.warn({
        msg: "Failed to dispatch outbox event",
        eventId: event.id,
        error: errMsg,
        retryCount: nextRetry,
        status: isExhausted ? "FAILED" : "PENDING",
      });

      await prisma.outboxEvent.update({
        where: { id: eventId },
        data: {
          status: isExhausted ? OutboxStatus.FAILED : OutboxStatus.PENDING,
          retryCount: nextRetry,
          lastError: errMsg,
        },
      });

      return false;
    }
  }

  /**
   * Concurrency-safe batch claiming across multiple worker processes.
   * Uses PostgreSQL row-locking `FOR UPDATE SKIP LOCKED` so two background workers
   * running concurrently never claim the same pending records.
   */
  async claimPendingBatch(batchSize = 20): Promise<OutboxEvent[]> {
    return prisma.$transaction(
      async (tx) => {
        // 1. Recover stale processing records older than 60 seconds (in case a worker crashed)
        const staleThreshold = new Date(Date.now() - 60000);
        await tx.outboxEvent.updateMany({
          where: {
            status: OutboxStatus.PROCESSING,
            updatedAt: { lt: staleThreshold },
          },
          data: {
            status: OutboxStatus.PENDING,
          },
        });

        // 2. Select pending event IDs with FOR UPDATE SKIP LOCKED
        const claimed = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM outbox_events
          WHERE status = 'PENDING'
          ORDER BY created_at ASC
          LIMIT ${batchSize}
          FOR UPDATE SKIP LOCKED
        `;

        if (!claimed || claimed.length === 0) {
          return [];
        }

        const ids = claimed.map((r) => r.id);

        // 3. Atomically transition claimed events to PROCESSING status
        await tx.outboxEvent.updateMany({
          where: { id: { in: ids } },
          data: { status: OutboxStatus.PROCESSING },
        });

        // 4. Return the claimed event records
        return tx.outboxEvent.findMany({
          where: { id: { in: ids } },
          orderBy: { createdAt: "asc" },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 10000,
      }
    );
  }

  /**
   * Process pending outbox events safely.
   * Can be called by a cron job, background worker, or sweep timer.
   */
  async processPendingEvents(batchSize = 20): Promise<{ processed: number; succeeded: number }> {
    let claimedEvents: OutboxEvent[] = [];

    try {
      claimedEvents = await this.claimPendingBatch(batchSize);
    } catch (err: unknown) {
      // Graceful fallback for database engines or mocks that do not support raw row locking
      logger.warn({
        msg: "Fallback to Prisma findMany for outbox batch claim",
        error: err instanceof Error ? err.message : String(err),
      });

      claimedEvents = await prisma.outboxEvent.findMany({
        where: { status: OutboxStatus.PENDING },
        orderBy: { createdAt: "asc" },
        take: batchSize,
      });
    }

    let succeeded = 0;
    const now = Date.now();

    for (const ev of claimedEvents) {
      // Check exponential backoff window if event has already failed previously
      if (ev.retryCount > 0) {
        const requiredDelay = this.calculateBackoffMs(ev.retryCount);
        const elapsed = now - ev.updatedAt.getTime();
        if (elapsed < requiredDelay) {
          // Delay hasn't elapsed; revert to PENDING and skip this sweep
          await prisma.outboxEvent.update({
            where: { id: ev.id },
            data: { status: OutboxStatus.PENDING },
          });
          continue;
        }
      }

      const ok = await this.dispatchEvent(ev.id);
      if (ok) succeeded++;
    }

    return { processed: claimedEvents.length, succeeded };
  }

  /**
   * Retrieve failed events for failure visibility and administrator alerting.
   */
  async getFailedEvents(tenantId?: string, take = 50): Promise<OutboxEvent[]> {
    return prisma.outboxEvent.findMany({
      where: {
        status: OutboxStatus.FAILED,
        ...(tenantId ? { tenantId } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take,
    });
  }

  /**
   * Re-queue a failed event for retry.
   */
  async retryFailedEvent(eventId: string): Promise<boolean> {
    const event = await prisma.outboxEvent.findUnique({
      where: { id: eventId },
    });

    if (!event || event.status !== OutboxStatus.FAILED) {
      return false;
    }

    await prisma.outboxEvent.update({
      where: { id: eventId },
      data: {
        status: OutboxStatus.PENDING,
        retryCount: 0,
        lastError: null,
      },
    });

    return this.dispatchEvent(eventId);
  }

  /**
   * Re-queue all failed events for a tenant.
   */
  async retryAllFailedEvents(tenantId?: string): Promise<number> {
    const failed = await this.getFailedEvents(tenantId, 100);
    let retried = 0;

    for (const ev of failed) {
      const ok = await this.retryFailedEvent(ev.id);
      if (ok) retried++;
    }

    return retried;
  }

  /**
   * Aggregate outbox statistics for health checks and observability.
   */
  async getOutboxStats(tenantId?: string): Promise<{
    pending: number;
    processing: number;
    published: number;
    failed: number;
  }> {
    const where = tenantId ? { tenantId } : {};

    const [pending, processing, published, failed] = await Promise.all([
      prisma.outboxEvent.count({ where: { ...where, status: OutboxStatus.PENDING } }),
      prisma.outboxEvent.count({ where: { ...where, status: OutboxStatus.PROCESSING } }),
      prisma.outboxEvent.count({ where: { ...where, status: OutboxStatus.PUBLISHED } }),
      prisma.outboxEvent.count({ where: { ...where, status: OutboxStatus.FAILED } }),
    ]);

    return { pending, processing, published, failed };
  }

  /**
   * Start the recurring in-process background worker daemon.
   */
  startBackgroundWorker(intervalMs = 2000): void {
    if (this.workerTimer) return;

    this.workerTimer = setInterval(async () => {
      if (this.isProcessing) return;
      this.isProcessing = true;
      try {
        await this.processPendingEvents(20);
      } catch (err: unknown) {
        logger.error({
          msg: "Outbox background worker sweep error",
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        this.isProcessing = false;
      }
    }, intervalMs);

    logger.info({
      msg: "Outbox background worker daemon started",
      intervalMs,
    });
  }

  /**
   * Stop the background worker daemon cleanly.
   */
  stopBackgroundWorker(): void {
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = null;
      logger.info({ msg: "Outbox background worker daemon stopped" });
    }
  }
}

export const outboxService = new OutboxService();
