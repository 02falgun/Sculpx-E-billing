import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

// Select the effective connection URL.
// When DIRECT_URL is present, it connects via session pooler port :5432.
// We configure connection_limit=5 to prevent exceeding Supabase's max client pool of 15.
let rawUrl = env.DIRECT_URL || env.DATABASE_URL;
if (rawUrl && !rawUrl.includes("connection_limit")) {
  const separator = rawUrl.includes("?") ? "&" : "?";
  rawUrl = `${rawUrl}${separator}connection_limit=3&pool_timeout=60`;
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
      error: "No database connection URL configured (DATABASE_URL / DIRECT_URL missing)",
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
