import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";

describe("GET /api/health & Liveness Probes", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("should return HTTP 200 and HEALTHY status on /api/health", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });

    expect(response.statusCode).toBe(200);

    const payload = JSON.parse(response.payload);
    expect(payload.success).toBe(true);
    expect(payload.data).toBeDefined();
    expect(payload.data.status).toBe("HEALTHY");
    expect(payload.data.service).toBe("sculpx-ebilling-backend");
    expect(typeof payload.data.uptimeSeconds).toBe("number");
    expect(payload.meta).toBeDefined();
    expect(payload.meta.requestId).toBeDefined();
    expect(payload.meta.serverVersion).toBe("1.0.0");
  });

  it("should return HTTP 200 on root /health alias", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.payload);
    expect(payload.success).toBe(true);
    expect(payload.data.status).toBe("HEALTHY");
  });

  it("should return HTTP 200 on /api/v1/health versioned alias", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/v1/health",
    });

    expect(response.statusCode).toBe(200);
    const payload = JSON.parse(response.payload);
    expect(payload.success).toBe(true);
    expect(payload.data.status).toBe("HEALTHY");
  });

  it("should preserve custom incoming x-request-id", async () => {
    const customId = "test-req-custom-999";
    const response = await app.inject({
      method: "GET",
      url: "/api/health",
      headers: {
        "x-request-id": customId,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["x-request-id"]).toBe(customId);

    const payload = JSON.parse(response.payload);
    expect(payload.meta.requestId).toBe(customId);
  });
});
