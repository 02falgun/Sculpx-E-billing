import fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import cors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import crypto from "node:crypto";
import { env } from "./config/env.js";
import { getFastifyLoggerConfig } from "./lib/logger.js";
import { fastifyErrorHandler } from "./lib/errors.js";
import fastifyWebsocket from "@fastify/websocket";
import { healthRoutes } from "./routes/health.js";
import { apiRoutes } from "./routes/index.js";
import { websocketRoutes } from "./routes/websocket.js";
import { websocketService } from "./services/websocket.service.js";
import { outboxService } from "./services/outbox.service.js";
import { printWorkerService } from "./services/print-worker.service.js";
import { printAgentGatewayService } from "./services/print-agent-gateway.service.js";

export interface BuildAppOptions {
  fastifyOptions?: FastifyServerOptions;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const loggerConfig = getFastifyLoggerConfig();

  const app = fastify({
    logger: loggerConfig,
    genReqId: (req) => {
      const incomingId = req.headers["x-request-id"];
      return typeof incomingId === "string" ? incomingId : crypto.randomUUID();
    },
    requestIdHeader: "x-request-id",
    ...options.fastifyOptions,
  });

  // Attach Request-ID to outgoing response headers
  app.addHook("onSend", async (request, reply) => {
    reply.header("x-request-id", request.id);
  });

  // Configure CORS
  const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      // Allow localhost in development
      if (env.NODE_ENV === "development" && origin.startsWith("http://localhost")) {
        return cb(null, true);
      }
      // Allow Vercel preview and production deployments
      if (
        origin === "https://sculpx-e-billing.vercel.app" ||
        origin.endsWith(".vercel.app")
      ) {
        return cb(null, true);
      }
      return cb(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "x-request-id",
      "Idempotency-Key",
      "X-Requested-With",
      "x-qr-token",
      "X-QR-Token",
    ],
    exposedHeaders: ["x-request-id"],
  });

  // Register JWT Plugin
  await app.register(fastifyJwt as any, {
    secret: env.JWT_SECRET,
    sign: {
      issuer: "sculpx-ebilling-api",
      audience: "sculpx-staff",
    },
    verify: {
      issuer: "sculpx-ebilling-api",
      audience: "sculpx-staff",
    },
  });

  // Register Rate Limiting Plugin
  await app.register(rateLimit, {
    global: false, // Per-route enforcement
  });

  // Global Error Handler
  app.setErrorHandler(fastifyErrorHandler);

  // Register WebSocket plugin
  await app.register(fastifyWebsocket);

  // Register WebSocket routes (/ws)
  await app.register(websocketRoutes);

  // Register Root Health Endpoints: /health and /ready
  await app.register(healthRoutes);

  // Register API Endpoints: /api/health, /api/ready, /api/v1/...
  await app.register(apiRoutes, { prefix: env.API_PREFIX });

  // Clean shutdown hook
  app.addHook("onClose", async () => {
    printAgentGatewayService.shutdown();
    websocketService.shutdown();
    outboxService.stopBackgroundWorker();
    await printWorkerService.stopBackgroundWorker();
  });

  return app;
}
