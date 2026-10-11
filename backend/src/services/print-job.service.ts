import { Prisma, PrintJobStatus, type PrintJob } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { printerService } from "./printer.service.js";
import { PrinterRenderer } from "./printer-renderer.js";
import { websocketService } from "./websocket.service.js";

export interface CreatePrintJobInput {
  printerId?: string;
  type: "KOT" | "BILL_RECEIPT" | "DAY_END_REPORT" | "TEST_PAGE" | string;
  referenceId?: string | null;
  station?: string | null;
  payload: Record<string, unknown>;
  idempotencyKey?: string | null;
  initiatedBy?: string | null;
  maxRetries?: number;
}

export interface ListPrintJobsFilter {
  status?: PrintJobStatus;
  printerId?: string;
  jobType?: string;
  page?: number;
  limit?: number;
}

export class PrintJobService {
  /**
   * Maximum allowed retry attempts before a job transitions permanently to FAILED.
   */
  public readonly DEFAULT_MAX_RETRIES = 3;

  /**
   * Calculate exponential backoff delay in milliseconds.
   * e.g.: retry 0 -> 2,000ms, retry 1 -> 4,000ms, retry 2 -> 8,000ms, capped at 30,000ms.
   */
  calculateBackoffMs(retryCount: number): number {
    return Math.min(2000 * Math.pow(2, retryCount), 30000);
  }

  /**
   * Create a durable, transactional print job.
   * Prevents duplicates via idempotency key or business reference deduplication.
   */
  async createJob(
    tenantId: string,
    input: CreatePrintJobInput,
    tx?: Prisma.TransactionClient
  ): Promise<PrintJob> {
    const db = tx || prisma;

    // 1. Check idempotencyKey deduplication
    if (input.idempotencyKey) {
      const existing = await db.printJob.findFirst({
        where: {
          tenantId,
          idempotencyKey: input.idempotencyKey,
        },
      });

      if (existing) {
        logger.info({
          msg: "Duplicate print job suppressed via idempotency key",
          existingJobId: existing.id,
          idempotencyKey: input.idempotencyKey,
          status: existing.status,
        });
        return existing;
      }
    }

    // 2. Resolve destination printer
    let printerId = input.printerId;
    if (!printerId) {
      const routed = await printerService.routePrinter(tenantId, input.type, input.station || undefined);
      if (!routed) {
        throw new AppError(
          `No active hardware printer found for document type '${input.type}' and station '${input.station || "DEFAULT"}'`,
          400,
          "NO_PRINTER_AVAILABLE"
        );
      }
      printerId = routed.id;
    } else {
      // Verify printer exists, belongs to tenant, and is active
      const printer = await db.printer.findUnique({
        where: { id: printerId },
      });
      if (!printer || printer.tenantId !== tenantId) {
        throw new AppError("Specified printer not found or does not belong to tenant", 404, "PRINTER_NOT_FOUND");
      }
    }

    // 3. Business reference deduplication for in-flight jobs
    if (input.referenceId) {
      const activeJob = await db.printJob.findFirst({
        where: {
          tenantId,
          printerId,
          jobType: input.type,
          referenceId: input.referenceId,
          status: { in: [PrintJobStatus.QUEUED, PrintJobStatus.PRINTING] },
        },
      });

      if (activeJob) {
        logger.info({
          msg: "In-flight print job already active for business reference",
          activeJobId: activeJob.id,
          referenceId: input.referenceId,
          status: activeJob.status,
        });
        return activeJob;
      }
    }

    // 4. Create the durable job record
    const job = await db.printJob.create({
      data: {
        tenantId,
        printerId,
        jobType: input.type,
        referenceId: input.referenceId || null,
        payload: input.payload as any,
        status: PrintJobStatus.QUEUED,
        retryCount: 0,
        maxRetries: input.maxRetries || this.DEFAULT_MAX_RETRIES,
        idempotencyKey: input.idempotencyKey || null,
        initiatedBy: input.initiatedBy || "SYSTEM",
      },
      include: {
        printer: true,
      },
    });

    logger.info({
      event: "print_job_created",
      jobId: job.id,
      printerId: job.printerId,
      jobType: job.jobType,
      referenceId: job.referenceId,
      tenantId,
    });

    this.broadcastJobStatus(job);
    return job;
  }

  /**
   * List paginated print jobs for tenant.
   */
  async listJobs(
    tenantId: string,
    filters: ListPrintJobsFilter = {}
  ): Promise<{ data: PrintJob[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.PrintJobWhereInput = {
      tenantId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.printerId ? { printerId: filters.printerId } : {}),
      ...(filters.jobType ? { jobType: filters.jobType } : {}),
    };

    const [total, data] = await Promise.all([
      prisma.printJob.count({ where }),
      prisma.printJob.findMany({
        where,
        include: {
          printer: {
            select: {
              id: true,
              name: true,
              type: true,
              station: true,
              location: true,
              paperWidthMm: true,
              isOnline: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Get a single print job by ID with tenant scoping.
   */
  async getJobById(tenantId: string, jobId: string): Promise<PrintJob & { printer: any }> {
    const job = await prisma.printJob.findUnique({
      where: { id: jobId },
      include: {
        printer: true,
      },
    });

    if (!job || job.tenantId !== tenantId) {
      throw new AppError("Print job not found", 404, "PRINT_JOB_NOT_FOUND");
    }

    return job;
  }

  /**
   * Manually retry a failed or uncertain print job.
   */
  async retryJob(tenantId: string, jobId: string, userId: string): Promise<PrintJob> {
    const job = await this.getJobById(tenantId, jobId);

    if (job.status !== PrintJobStatus.FAILED && job.status !== PrintJobStatus.UNCERTAIN) {
      throw new AppError(
        `Print job cannot be retried from status '${job.status}'. Only FAILED or UNCERTAIN jobs are eligible for retry.`,
        400,
        "INVALID_JOB_STATE_FOR_RETRY"
      );
    }

    const updated = await prisma.printJob.update({
      where: { id: jobId },
      data: {
        status: PrintJobStatus.QUEUED,
        errorMessage: null,
        nextRetryAt: null,
        initiatedBy: `Retry by user ${userId}`,
      },
      include: { printer: true },
    });

    logger.info({
      event: "print_job_retried_manually",
      jobId: job.id,
      tenantId,
      userId,
    });

    this.broadcastJobStatus(updated);
    return updated;
  }

  /**
   * Issue an authorized reprint copy for a previously generated job.
   * Generates a NEW distinct print job marked with `isReprint = true` and duplicate watermark.
   */
  async reprintJob(
    tenantId: string,
    jobId: string,
    userId: string,
    reason?: string
  ): Promise<PrintJob> {
    const original = await this.getJobById(tenantId, jobId);

    const payload = (original.payload as Record<string, unknown>) || {};
    const previousReprintCount = Number(payload.reprintCount || 0);

    const reprintPayload = {
      ...payload,
      isReprint: true,
      reprintReason: reason || "Supervisor authorized duplicate copy",
      reprintCount: previousReprintCount + 1,
      originalJobId: original.id,
      reprintedAt: new Date().toISOString(),
    };

    const duplicateJob = await prisma.printJob.create({
      data: {
        tenantId,
        printerId: original.printerId,
        jobType: original.jobType,
        referenceId: original.referenceId,
        payload: reprintPayload as any,
        status: PrintJobStatus.QUEUED,
        retryCount: 0,
        maxRetries: original.maxRetries,
        isReprint: true,
        reprintReason: reason || "Supervisor authorized duplicate copy",
        initiatedBy: `Reprint by user ${userId}`,
      },
      include: { printer: true },
    });

    logger.info({
      event: "print_job_reprint_created",
      originalJobId: original.id,
      duplicateJobId: duplicateJob.id,
      tenantId,
      userId,
      reason,
    });

    this.broadcastJobStatus(duplicateJob);
    return duplicateJob;
  }

  /**
   * Cancel a pending (QUEUED) job before hardware transmission.
   */
  async cancelJob(
    tenantId: string,
    jobId: string,
    userId: string,
    reason?: string
  ): Promise<PrintJob> {
    const job = await this.getJobById(tenantId, jobId);

    if (
      job.status !== PrintJobStatus.QUEUED &&
      job.status !== PrintJobStatus.UNCERTAIN &&
      job.status !== PrintJobStatus.FAILED
    ) {
      throw new AppError(
        `Print job cannot be cancelled while in '${job.status}' status. Only QUEUED, UNCERTAIN, or FAILED jobs can be cancelled.`,
        400,
        "INVALID_JOB_STATE_FOR_CANCELLATION"
      );
    }

    const updated = await prisma.printJob.update({
      where: { id: jobId },
      data: {
        status: PrintJobStatus.CANCELLED,
        errorMessage: reason || `Cancelled by user ${userId}`,
        completedAt: new Date(),
      },
      include: { printer: true },
    });

    logger.info({
      event: "print_job_cancelled",
      jobId: job.id,
      tenantId,
      userId,
      reason,
    });

    this.broadcastJobStatus(updated);
    return updated;
  }

  /**
   * Concurrency-safe batch claiming across background workers.
   * Uses PostgreSQL row-locking `FOR UPDATE SKIP LOCKED` so concurrent workers
   * never claim or execute the exact same pending job.
   */
  async claimPendingBatch(batchSize = 10): Promise<Array<PrintJob & { printer: any }>> {
    return prisma.$transaction(
      async (tx) => {
        // 1. Recover abandoned PRINTING jobs older than 60 seconds (worker crashed or network stalled during transmission)
        // CRITICAL RECOVERY INVARIANT: Never blindly reset abandoned PRINTING jobs to QUEUED because bytes
        // may have already been transmitted to or accepted by the physical printer's buffer.
        // Instead, transition them to UNCERTAIN to require authorized inspection and prevent duplicate physical prints.
        const staleThreshold = new Date(Date.now() - 60000);
        await tx.printJob.updateMany({
          where: {
            status: PrintJobStatus.PRINTING,
            updatedAt: { lt: staleThreshold },
          },
          data: {
            status: PrintJobStatus.UNCERTAIN,
            errorMessage: "Worker heartbeat expired during transmission (potential crash or network stall); flagged UNCERTAIN to prevent duplicate physical print",
          },
        });

        // 2. Select eligible pending job IDs with FOR UPDATE SKIP LOCKED
        const claimed = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM print_jobs
          WHERE status = 'QUEUED'
            AND (next_retry_at IS NULL OR next_retry_at <= NOW())
          ORDER BY created_at ASC
          LIMIT ${batchSize}
          FOR UPDATE SKIP LOCKED
        `;

        if (!claimed || claimed.length === 0) {
          return [];
        }

        const ids = claimed.map((r) => r.id);

        // 3. Atomically transition claimed jobs to PRINTING status
        await tx.printJob.updateMany({
          where: { id: { in: ids } },
          data: { status: PrintJobStatus.PRINTING },
        });

        // 4. Return claimed records with their associated printer
        return tx.printJob.findMany({
          where: { id: { in: ids } },
          include: { printer: true },
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
   * Execute physical printing for a claimed job through the active hardware adapter.
   * Does NOT hold database locks during slow hardware I/O.
   */
  async executeJob(job: PrintJob & { printer: any }): Promise<boolean> {
    const adapter = printerService.getAdapter();

    try {
      // 1. Render ESC/POS binary or formatted payload from snapshot
      const rawPayload = (job.payload as Record<string, unknown>) || {};
      const escPosBuffer = PrinterRenderer.renderEscPos(job.jobType, rawPayload, {
        paperWidthMm: job.printer.paperWidthMm || 80,
        isReprint: job.isReprint,
        reprintReason: job.reprintReason || undefined,
      });

      // 2. Transmit to physical hardware via adapter
      const result = await adapter.print(job.printer, escPosBuffer, {
        jobId: job.id,
        jobType: job.jobType,
        isReprint: job.isReprint,
      });

      if (result.success) {
        // Successful transmission
        const updated = await prisma.printJob.update({
          where: { id: job.id },
          data: {
            status: PrintJobStatus.COMPLETED,
            completedAt: new Date(),
            errorMessage: null,
          },
          include: { printer: true },
        });

        // Update printer online status
        await prisma.printer.update({
          where: { id: job.printerId },
          data: { isOnline: true, lastPingAt: new Date() },
        });

        this.broadcastJobStatus(updated);
        return true;
      }

      // Check if outcome is uncertain (e.g. data transmitted, but ACK lost)
      if (result.uncertain) {
        logger.warn({
          msg: "Print job resulted in ambiguous / uncertain hardware outcome",
          jobId: job.id,
          error: result.error,
        });

        const updated = await prisma.printJob.update({
          where: { id: job.id },
          data: {
            status: PrintJobStatus.UNCERTAIN,
            errorMessage: result.error || "Ambiguous outcome: hardware connection dropped during transmission",
          },
          include: { printer: true },
        });

        this.broadcastJobStatus(updated);
        return false;
      }

      // Definite failure: calculate bounded retry
      return this.handleJobFailure(job, result.error || "Unknown hardware error");
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return this.handleJobFailure(job, errMsg);
    }
  }

  /**
   * Handle failure with bounded exponential retries.
   */
  private async handleJobFailure(job: PrintJob & { printer: any }, error: string): Promise<boolean> {
    const nextRetry = job.retryCount + 1;
    const isExhausted = nextRetry >= job.maxRetries;

    const delayMs = this.calculateBackoffMs(nextRetry);
    const nextRetryAt = isExhausted ? null : new Date(Date.now() + delayMs);

    logger.warn({
      msg: "Print job hardware transmission failed",
      jobId: job.id,
      retryCount: nextRetry,
      maxRetries: job.maxRetries,
      isExhausted,
      nextRetryAt,
      error,
    });

    const updated = await prisma.printJob.update({
      where: { id: job.id },
      data: {
        status: isExhausted ? PrintJobStatus.FAILED : PrintJobStatus.QUEUED,
        retryCount: nextRetry,
        errorMessage: error,
        nextRetryAt,
      },
      include: { printer: true },
    });

    // Mark printer offline if connection failed
    await prisma.printer.update({
      where: { id: job.printerId },
      data: { isOnline: false },
    });

    this.broadcastJobStatus(updated);
    return false;
  }

  /**
   * Broadcast real-time status updates over WebSocket topic `printers:jobs`.
   */
  private broadcastJobStatus(job: PrintJob & { printer?: any }): void {
    try {
      websocketService.broadcastEvent({
        tenantId: job.tenantId,
        eventType: "PRINT_JOB_STATUS",
        topic: "printers:jobs",
        payload: {
          jobId: job.id,
          printerId: job.printerId,
          printerName: job.printer?.name || "Printer",
          type: job.jobType,
          referenceId: job.referenceId,
          status: job.status,
          retryCount: job.retryCount,
          maxRetries: job.maxRetries,
          errorMessage: job.errorMessage,
          isReprint: job.isReprint,
          completedAt: job.completedAt ? job.completedAt.toISOString() : null,
          createdAt: job.createdAt.toISOString(),
        },
      });
    } catch (err) {
      logger.warn({ msg: "Failed to broadcast print job status frame", err });
    }
  }
}

export const printJobService = new PrintJobService();
