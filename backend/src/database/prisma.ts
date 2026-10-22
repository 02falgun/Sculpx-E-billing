import { PrismaClient, type Prisma } from "@prisma/client";
import { env } from "../config/env.js";

// Select the effective connection URL.
// Uses DATABASE_URL (direct PostgreSQL connection).
// Appends a conservative connection_limit when the URL does not already set one.
let rawUrl = env.DATABASE_URL;
if (rawUrl && !rawUrl.includes("connection_limit")) {
  const separator = rawUrl.includes("?") ? "&" : "?";
  rawUrl = `${rawUrl}${separator}connection_limit=3&pool_timeout=60&connect_timeout=15`;
}
const effectiveDatabaseUrl = rawUrl;

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

export function createPrismaClient(): PrismaClient {
  if (global.__prismaClient) {
    return global.__prismaClient;
  }

  const client = new PrismaClient({
    datasources: effectiveDatabaseUrl
      ? {
          db: {
            url: effectiveDatabaseUrl,
          },
        }
      : undefined,
    log:
      env.NODE_ENV === "development"
        ? [
            { emit: "event", level: "error" },
            { emit: "event", level: "warn" },
          ]
        : [{ emit: "event", level: "error" }],
  });

  if (env.NODE_ENV !== "production") {
    global.__prismaClient = client;
  }

  return client;
}

export const prisma = createPrismaClient();

/**
 * Either the root client or a transaction client. Model functions accept this
 * as their last argument so they can run inside `prisma.$transaction(...)`.
 */
export type DbClient = PrismaClient | Prisma.TransactionClient;

export interface TransactionOptions {
  maxWait?: number;
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
}

/**
 * Run `fn` inside a database transaction. Pass the `tx` client to model functions.
 */
export function withTransaction<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: TransactionOptions
): Promise<T> {
  return prisma.$transaction(fn, options);
}

export interface DatabaseHealthResult {
  connected: boolean;
  latencyMs?: number;
  error?: string;
  timestamp: string;
}

export async function checkDatabaseHealth(): Promise<DatabaseHealthResult> {
  const timestamp = new Date().toISOString();

  if (!effectiveDatabaseUrl) {
    return {
      connected: false,
      error: "No database connection URL configured (DATABASE_URL missing)",
      timestamp,
    };
  }

  const startTime = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1 as connected;`;
    const latencyMs = Date.now() - startTime;
    return {
      connected: true,
      latencyMs,
      timestamp,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown database connection failure";
    return {
      connected: false,
      error: message,
      timestamp,
    };
  }
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
