import { logger } from "../lib/logger.js";
import { printJobService } from "./print-job.service.js";

export class PrintWorkerService {
  private workerTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  /**
   * Process a batch of pending print jobs.
   */
  async processPendingJobs(batchSize = 10): Promise<{ processed: number; succeeded: number }> {
    let claimedJobs: any[] = [];

    try {
      claimedJobs = await printJobService.claimPendingBatch(batchSize);
    } catch (err: unknown) {
      logger.warn({
        msg: "Failed to claim print job batch via PostgreSQL row locking",
        error: err instanceof Error ? err.message : String(err),
      });
      return { processed: 0, succeeded: 0 };
    }

    if (claimedJobs.length === 0) {
      return { processed: 0, succeeded: 0 };
    }

    logger.info({
      msg: "Processing claimed print jobs batch",
      count: claimedJobs.length,
    });

    let succeeded = 0;

    for (const job of claimedJobs) {
      try {
        const ok = await printJobService.executeJob(job);
        if (ok) succeeded++;
      } catch (err: unknown) {
        logger.error({
          msg: "Unhandled error executing print job in background worker",
          jobId: job.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return { processed: claimedJobs.length, succeeded };
  }

  /**
   * Start in-process background worker daemon for automatic print job dispatch.
   */
  startBackgroundWorker(pollIntervalMs = 3000): void {
    if (this.workerTimer) {
      logger.warn("Print worker daemon is already running; skipping duplicate start");
      return;
    }

    logger.info({
      msg: "Starting print queue background worker daemon",
      pollIntervalMs,
    });

    this.workerTimer = setInterval(async () => {
      if (this.isProcessing) return; // Prevent overlapping runs in the same process
      this.isProcessing = true;

      try {
        await this.processPendingJobs(10);
      } catch (err: unknown) {
        logger.error({
          msg: "Error during print worker sweep",
          error: err instanceof Error ? err.message : String(err),
        });
      } finally {
        this.isProcessing = false;
      }
    }, pollIntervalMs);

    // Allow process to exit cleanly without waiting on interval
    if (this.workerTimer.unref) {
      this.workerTimer.unref();
    }
  }

  /**
   * Stop background worker daemon gracefully.
   * Clears polling timer and waits for any active batch sweep to finish (up to drainTimeoutMs).
   */
  async stopBackgroundWorker(drainTimeoutMs = 5000): Promise<void> {
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = null;
      logger.info("Print queue background worker daemon stopped");
    }

    if (this.isProcessing) {
      logger.info("Waiting for active print worker sweep to drain before stopping...");
      const start = Date.now();
      while (this.isProcessing && Date.now() - start < drainTimeoutMs) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }

  /**
   * Check if worker is currently running.
   */
  isRunning(): boolean {
    return this.workerTimer !== null;
  }
}

export const printWorkerService = new PrintWorkerService();
