import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

// Load environment files in priority order:
// 1. backend/.env.local
// 2. backend/.env
// 3. parent ../.env.local (if available)
const cwd = process.cwd();
dotenv.config({ path: path.resolve(cwd, ".env.local") });
dotenv.config({ path: path.resolve(cwd, ".env") });
dotenv.config({ path: path.resolve(cwd, "..", ".env.local") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().min(1).max(65535).default(8000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().optional(),
  DIRECT_URL: z.string().optional(),
  API_PREFIX: z.string().default("/api"),
  JWT_SECRET: z.string().default("sculpx-dev-jwt-secret-key-min-32-characters-for-security-2026"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  DEMO_SEED_PASSWORD: z.string().default("demo-secure-pass"),
  ALLOW_DEMO_SEED: z
    .string()
    .transform((v) => v.toLowerCase() === "true" || v === "1")
    .default("true"),
  RATE_LIMIT_MAX: z.coerce.number().min(1).default(10),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().min(1000).default(60000),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`);
    throw new Error(
      `Invalid backend runtime environment configuration:\n${issues.join("\n")}`
    );
  }

  const data = parsed.data;

  // Enforce secure JWT Secret in production
  if (data.NODE_ENV === "production") {
    if (
      !data.JWT_SECRET ||
      data.JWT_SECRET.length < 32 ||
      data.JWT_SECRET.includes("sculpx-dev-jwt-secret")
    ) {
      throw new Error(
        "Production startup aborted: JWT_SECRET must be configured with at least 32 cryptographically secure characters."
      );
    }

    if (data.ALLOW_DEMO_SEED) {
      throw new Error(
        "Production startup aborted: ALLOW_DEMO_SEED cannot be enabled in production environments."
      );
    }
  }

  return data;
}

export const env = loadEnv();
