import { outboxService } from "../services/outbox.service.js";
import { logger } from "../lib/logger.js";
import { disconnectPrisma } from "../lib/prisma.js";

async function runWorker(): Promise<void> {
  logger.info("Starting standalone SCULPX E-Billing Outbox Worker...");

  let isRunning = true;
  const pollIntervalMs = 2000;

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Graceful shutdown of outbox worker initiated...");
    isRunning = false;
    outboxService.stopBackgroundWorker();
    await disconnectPrisma();
    logger.info("Outbox worker terminated cleanly.");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  logger.info({ pollIntervalMs }, "Outbox worker loop active. Polling pending events...");

  while (isRunning) {
    try {
      const stats = await outboxService.processPendingEvents(25);
      if (stats.processed > 0) {
        logger.info(
          { processed: stats.processed, succeeded: stats.succeeded },
          "Outbox batch sweep completed."
        );
      }
    } catch (err: unknown) {
      logger.error(
        { error: err instanceof Error ? err.message : String(err) },
        "Error in outbox worker loop"
      );
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

runWorker().catch((err) => {
  logger.fatal({ err }, "Fatal outbox worker startup error");
  process.exit(1);
});
