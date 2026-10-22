import { Prisma, PrintJobStatus, type PrintJob } from "@prisma/client";
import { withTransaction } from "../database/prisma.js";
import { BadRequestError, NotFoundError } from "../lib/errors.js";
import { ErrorCode } from "../constants/error-codes.js";
import { logger } from "../lib/logger.js";
import { printJobModel } from "../models/print-job.model.js";
import { printerModel } from "../models/printer.model.js";
import { printerService } from "./printer.service.js";
import { PrinterRenderer } from "../integrations/printer/escpos-renderer.js";
import { websocketService } from "./websocket.service.js";
import type {
  BroadcastablePrintJob,
  CreatePrintJobInput,
  ListPrintJobsFilter,
  PrintJobWithPrinter,
} from "../types/print-job.types.js";

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
    // 1. Check idempotencyKey deduplication
    if (input.idempotencyKey) {
      const existing = await printJobModel.findByIdempotencyKey(tenantId, input.idempotencyKey, tx);

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
        throw new BadRequestError(`No active hardware printer found for document type '${input.type}' and station '${input.station || "DEFAULT"}'`, ErrorCode.NO_PRINTER_AVAILABLE);
      }
      printerId = routed.id;
    } else {
      // Verify printer exists, belongs to tenant, and is active
      const printer = await printerModel.findById(printerId, tx);
      if (!printer || printer.tenantId !== tenantId) {
        throw new NotFoundError("Specified printer not found or does not belong to tenant", ErrorCode.PRINTER_NOT_FOUND);
      }
    }

    // 3. Business reference deduplication for in-flight jobs
    if (input.referenceId) {
      const activeJob = await printJobModel.findInFlightForReference(
        tenantId,
        printerId,
        input.type,
        input.referenceId,
        tx
      );

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
    const job = await printJobModel.create(
      {
        tenantId,
        printerId,
        jobType: input.type,
        referenceId: input.referenceId || null,
        // JSON-serialisable snapshot supplied by callers; Record<string, unknown> is not assignable to InputJsonObject.
        payload: input.payload as Prisma.InputJsonObject,
        status: PrintJobStatus.QUEUED,
        retryCount: 0,
        maxRetries: input.maxRetries || this.DEFAULT_MAX_RETRIES,
        idempotencyKey: input.idempotencyKey || null,
        initiatedBy: input.initiatedBy || "SYSTEM",
      },
      tx
    );

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

    const { total, data } = await printJobModel.findPage(tenantId, filters, limit, skip);

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
  async getJobById(tenantId: string, jobId: string): Promise<PrintJobWithPrinter> {
    const job = await printJobModel.findById(jobId);

    if (!job || job.tenantId !== tenantId) {
      throw new NotFoundError("Print job not found", ErrorCode.PRINT_JOB_NOT_FOUND);
    }

    return job;
  }

  /**
   * Manually retry a failed or uncertain print job.
   */
  async retryJob(tenantId: string, jobId: string, userId: string): Promise<PrintJob> {
    const job = await this.getJobById(tenantId, jobId);

    if (job.status !== PrintJobStatus.FAILED && job.status !== PrintJobStatus.UNCERTAIN) {
      throw new BadRequestError(`Print job cannot be retried from status '${job.status}'. Only FAILED or UNCERTAIN jobs are eligible for retry.`, ErrorCode.INVALID_JOB_STATE_FOR_RETRY);
    }

    const updated = await printJobModel.update(jobId, {
      status: PrintJobStatus.QUEUED,
      errorMessage: null,
      nextRetryAt: null,
      initiatedBy: `Retry by user ${userId}`,
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

    const reprintPayload: Record<string, unknown> = {
      ...payload,
      isReprint: true,
      reprintReason: reason || "Supervisor authorized duplicate copy",
      reprintCount: previousReprintCount + 1,
      originalJobId: original.id,
      reprintedAt: new Date().toISOString(),
    };

    const duplicateJob = await printJobModel.create({
      tenantId,
      printerId: original.printerId,
      jobType: original.jobType,
      referenceId: original.referenceId,
      // Spread of the stored JSON payload plus primitives, so still valid JSON.
      payload: reprintPayload as Prisma.InputJsonObject,
      status: PrintJobStatus.QUEUED,
      retryCount: 0,
      maxRetries: original.maxRetries,
      isReprint: true,
      reprintReason: reason || "Supervisor authorized duplicate copy",
      initiatedBy: `Reprint by user ${userId}`,
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
      throw new BadRequestError(`Print job cannot be cancelled while in '${job.status}' status. Only QUEUED, UNCERTAIN, or FAILED jobs can be cancelled.`, ErrorCode.INVALID_JOB_STATE_FOR_CANCELLATION);
    }

    const updated = await printJobModel.update(jobId, {
      status: PrintJobStatus.CANCELLED,
      errorMessage: reason || `Cancelled by user ${userId}`,
      completedAt: new Date(),
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
   * Queue a diagnostic test slip to the given printer.
   */
  async createTestJob(tenantId: string, printerId: string, initiatedBy: string): Promise<PrintJob> {
    const printer = await printerService.getPrinterById(tenantId, printerId);

    return this.createJob(tenantId, {
      printerId: printer.id,
      type: "TEST_PAGE",
      referenceId: `TEST-${Date.now()}`,
      payload: {
        printerName: printer.name,
        printerId: printer.id,
        ipAddress: printer.ipAddress,
        port: printer.port,
        station: printer.station,
        paperWidthMm: printer.paperWidthMm,
        connectionType: printer.connectionType,
        timestamp: new Date().toISOString(),
      },
      initiatedBy,
    });
  }

  /**
   * Concurrency-safe batch claiming across background workers.
   * Uses PostgreSQL row-locking `FOR UPDATE SKIP LOCKED` so concurrent workers
   * never claim or execute the exact same pending job.
   */
  async claimPendingBatch(batchSize = 10): Promise<PrintJobWithPrinter[]> {
    return withTransaction(
      async (tx) => {
        // 1. Recover abandoned PRINTING jobs older than 60 seconds (worker crashed or network stalled during transmission)
        // CRITICAL RECOVERY INVARIANT: Never blindly reset abandoned PRINTING jobs to QUEUED because bytes
        // may have already been transmitted to or accepted by the physical printer's buffer.
        // Instead, transition them to UNCERTAIN to require authorized inspection and prevent duplicate physical prints.
        const staleThreshold = new Date(Date.now() - 60000);
        await printJobModel.markStalePrintingUncertain(
          staleThreshold,
          "Worker heartbeat expired during transmission (potential crash or network stall); flagged UNCERTAIN to prevent duplicate physical print",
          tx
        );

        // 2. Select eligible pending job IDs with FOR UPDATE SKIP LOCKED
        const claimed = await printJobModel.lockDueQueuedIds(batchSize, tx);

        if (!claimed || claimed.length === 0) {
          return [];
        }

        const ids = claimed.map((r) => r.id);

        // 3. Atomically transition claimed jobs to PRINTING status
        await printJobModel.markPrinting(ids, tx);

        // 4. Return claimed records with their associated printer
        return printJobModel.findManyByIds(ids, tx);
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
  async executeJob(job: PrintJobWithPrinter): Promise<boolean> {
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
        const updated = await printJobModel.update(job.id, {
          status: PrintJobStatus.COMPLETED,
          completedAt: new Date(),
          errorMessage: null,
        });

        // Update printer online status
        await printerModel.update(job.printerId, { isOnline: true, lastPingAt: new Date() });

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

        const updated = await printJobModel.update(job.id, {
          status: PrintJobStatus.UNCERTAIN,
          errorMessage: result.error || "Ambiguous outcome: hardware connection dropped during transmission",
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
  private async handleJobFailure(job: PrintJobWithPrinter, error: string): Promise<boolean> {
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

    const updated = await printJobModel.update(job.id, {
      status: isExhausted ? PrintJobStatus.FAILED : PrintJobStatus.QUEUED,
      retryCount: nextRetry,
      errorMessage: error,
      nextRetryAt,
    });

    // Mark printer offline if connection failed
    await printerModel.update(job.printerId, { isOnline: false });

    this.broadcastJobStatus(updated);
    return false;
  }

  /**
   * Broadcast real-time status updates over WebSocket topic `printers:jobs`.
   */
  private broadcastJobStatus(job: BroadcastablePrintJob): void {
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
