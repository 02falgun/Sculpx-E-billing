import { pino } from "pino";
import type { FastifyServerOptions } from "fastify";
import { env } from "../config/env.js";

export const sensitiveRedactPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "res.headers['set-cookie']",
  "password",
  "passwordHash",
  "token",
  "qrToken",
  "req.params.token",
  "params.token",
  "secret",
  "databaseUrl",
  "directUrl",
  "DATABASE_URL",
  "DIRECT_URL",
];

export const logger = pino({
  level: env.NODE_ENV === "test" && env.LOG_LEVEL === "silent" ? "silent" : env.LOG_LEVEL,
  redact: {
    paths: sensitiveRedactPaths,
    censor: "[REDACTED]",
  },
});

export function getFastifyLoggerConfig(): FastifyServerOptions["logger"] {
  if (env.NODE_ENV === "test") {
    // Keep test logs clean or silent unless explicitly set
    return env.LOG_LEVEL === "silent"
      ? false
      : {
          level: env.LOG_LEVEL,
          redact: {
            paths: sensitiveRedactPaths,
            censor: "[REDACTED]",
          },
        };
  }

  if (env.NODE_ENV === "development") {
    return {
      level: env.LOG_LEVEL,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      },
      redact: {
        paths: sensitiveRedactPaths,
        censor: "[REDACTED]",
      },
    };
  }

  // Production: pure structured JSON
  return {
    level: env.LOG_LEVEL,
    redact: {
      paths: sensitiveRedactPaths,
      censor: "[REDACTED]",
    },
  };
}
