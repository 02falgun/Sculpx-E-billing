import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import * as prismaLib from "../src/database/prisma.js";

describe("GET /api/ready & Readiness Probes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("should return HTTP 200 and READY status when database is reachable", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/ready",
    });

    expect(response.statusCode).toBe(200);

    const payload = JSON.parse(response.payload);
    expect(payload.success).toBe(true);
    expect(payload.data).toBeDefined();
    expect(payload.data.status).toBe("READY");
    expect(payload.data.database).toBe("CONNECTED");
    expect(typeof payload.data.latencyMs).toBe("number");
    expect(payload.meta.requestId).toBeDefined();
  });

  it("should return HTTP 200 on /ready and /api/v1/ready aliases", async () => {
    const rootRes = await app.inject({ method: "GET", url: "/ready" });
    expect(rootRes.statusCode).toBe(200);

    const v1Res = await app.inject({ method: "GET", url: "/api/v1/ready" });
    expect(v1Res.statusCode).toBe(200);
  });

  it("should return HTTP 503 and DATABASE_UNAVAILABLE when database query fails", async () => {
    // Spy on checkDatabaseHealth to simulate DB outage
    const dbSpy = vi.spyOn(prismaLib, "checkDatabaseHealth").mockResolvedValueOnce({
      connected: false,
      error: "Supabase connection timed out",
      timestamp: new Date().toISOString(),
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/ready",
    });

    expect(response.statusCode).toBe(503);

    const payload = JSON.parse(response.payload);
    expect(payload.success).toBe(false);
    expect(payload.data).toBeNull();
    expect(payload.error).toBeDefined();
    expect(payload.error.code).toBe("DATABASE_UNAVAILABLE");
    expect(payload.error.message).toContain("Database connection is unavailable");
    expect(payload.error.details.error).toBe("Supabase connection timed out");

    dbSpy.mockRestore();
  });
});
