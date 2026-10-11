import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { disconnectPrisma } from "./lib/prisma.js";
import { outboxService } from "./services/outbox.service.js";
import { printWorkerService } from "./services/print-worker.service.js";

async function main(): Promise<void> {
  const app = await buildApp();

  const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];

  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info({ signal }, "Graceful shutdown initiated...");
      try {
        await app.close();
        await disconnectPrisma();
        app.log.info("Server and database connections successfully closed.");
        process.exit(0);
      } catch (err) {
        app.log.error({ err }, "Error during graceful shutdown");
        process.exit(1);
      }
    });
  }

  process.on("unhandledRejection", (err) => {
    app.log.fatal({ err }, "Unhandled Promise Rejection detected");
    process.exit(1);
  });

  process.on("uncaughtException", (err) => {
    app.log.fatal({ err }, "Uncaught Exception detected");
    process.exit(1);
  });

  try {
    await app.listen({ port: env.PORT, host: env.HOST });

    // Start in-process outbox event dispatcher worker daemon
    outboxService.startBackgroundWorker(2000);

    // Start in-process print queue worker daemon
    printWorkerService.startBackgroundWorker(3000);

    app.log.info(
      {
        port: env.PORT,
        host: env.HOST,
        env: env.NODE_ENV,
        healthEndpoint: `http://${env.HOST === "0.0.0.0" ? "localhost" : env.HOST}:${env.PORT}${env.API_PREFIX}/health`,
        readyEndpoint: `http://${env.HOST === "0.0.0.0" ? "localhost" : env.HOST}:${env.PORT}${env.API_PREFIX}/ready`,
      },
      "SCULPX E-Billing Backend service started successfully."
    );
  } catch (err) {
    app.log.fatal({ err }, "Failed to start server");
    process.exit(1);
  }
}

main();
