import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

const TEST_TENANT_A = "e1b1d1f0-0000-4000-8000-000000000001";
const TEST_TENANT_B = "00000000-0000-4000-8000-000000000099";

describe("SCULPX E-Billing — Phase 3B.1 QR Context Resolution Tests", () => {
  let app: FastifyInstance;

  // Test fixture IDs
  let tableAId: string;
  let roomAId: string;
  let foreignTableBId: string;

  const validTableToken = `test-tbl-${Date.now()}`;
  const validRoomToken = `test-room-${Date.now()}`;
  const inactiveToken = `test-inactive-${Date.now()}`;
  const unassignedToken = `test-unassigned-${Date.now()}`;
  const ambiguousToken = `test-ambiguous-${Date.now()}`;
  const crossTenantToken = `test-cross-tenant-${Date.now()}`;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Create a valid Table in Tenant A
    const tableA = await prisma.table.create({
      data: {
        tenantId: TEST_TENANT_A,
        tableNumber: "T-QR-1",
        displayName: "Royal Garden Table 1",
        capacity: 4,
        section: "Courtyard",
      },
    });
    tableAId = tableA.id;

    // 2. Create a valid Room in Tenant A (with sensitive guest data)
    const roomA = await prisma.room.create({
      data: {
        tenantId: TEST_TENANT_A,
        roomNumber: "305",
        floor: "3rd Floor",
        guestName: "Secret Private Guest",
        folioId: "FOLIO-CLASSIFIED-9999",
      },
    });
    roomAId = roomA.id;

    // 3. Create a foreign Table in Tenant B
    const foreignTableB = await prisma.table.create({
      data: {
        tenantId: TEST_TENANT_B,
        tableNumber: "T-FOREIGN-1",
        displayName: "Tenant B Table",
        capacity: 2,
        section: "Private Terrace",
      },
    });
    foreignTableBId = foreignTableB.id;

    // 4. Seed QR fixtures
    // Active Table QR
    await prisma.qrCode.create({
      data: {
        tenantId: TEST_TENANT_A,
        token: validTableToken,
        type: "TABLE",
        tableId: tableAId,
        isActive: true,
      },
    });

    // Active Room QR
    await prisma.qrCode.create({
      data: {
        tenantId: TEST_TENANT_A,
        token: validRoomToken,
        type: "ROOM",
        roomId: roomAId,
        isActive: true,
      },
    });

    // Inactive QR
    await prisma.qrCode.create({
      data: {
        tenantId: TEST_TENANT_A,
        token: inactiveToken,
        type: "TABLE",
        tableId: tableAId,
        isActive: false,
      },
    });

    // Unassigned QR (missing tableId)
    await prisma.qrCode.create({
      data: {
        tenantId: TEST_TENANT_A,
        token: unassignedToken,
        type: "TABLE",
        isActive: true,
      },
    });

    // Ambiguous QR (both table and room attached)
    await prisma.qrCode.create({
      data: {
        tenantId: TEST_TENANT_A,
        token: ambiguousToken,
        type: "TABLE",
        tableId: tableAId,
        roomId: roomAId,
        isActive: true,
      },
    });

    // Cross-tenant mismatch (QR in Tenant A referencing Table in Tenant B)
    await prisma.qrCode.create({
      data: {
        tenantId: TEST_TENANT_A,
        token: crossTenantToken,
        type: "TABLE",
        tableId: foreignTableBId,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    // Clean up QR fixtures
    await prisma.qrCode.deleteMany({
      where: {
        token: {
          in: [
            validTableToken,
            validRoomToken,
            inactiveToken,
            unassignedToken,
            ambiguousToken,
            crossTenantToken,
          ],
        },
      },
    });

    // Clean up tables and rooms
    if (tableAId) {
      await prisma.table.delete({ where: { id: tableAId } }).catch(() => {});
    }
    if (roomAId) {
      await prisma.room.delete({ where: { id: roomAId } }).catch(() => {});
    }
    if (foreignTableBId) {
      await prisma.table.delete({ where: { id: foreignTableBId } }).catch(() => {});
    }

    await app.close();
  });

  // =========================================================================
  // 1. Public Access & Valid Table QR Resolution
  // =========================================================================
  describe("1. Public Access & Valid Table QR Resolution", () => {
    it("should resolve a valid active table QR without requiring a staff JWT", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/public/qr-context/${validTableToken}`,
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.success).toBe(true);
      expect(json.data.type).toBe("TABLE");
      expect(json.data.identifier).toBe("T-QR-1");
      expect(json.data.displayName).toBe("Royal Garden Table 1");
      expect(json.data.locationDetails.section).toBe("Courtyard");
      expect(json.data.locationDetails.capacity).toBe(4);
      expect(json.data.subtext).toBe("Courtyard • 4 Seats");
      expect(json.data.isActive).toBe(true);
    });

    it("should resolve the same table context through the /api/public alias", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/public/qr-context/${validTableToken}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().data.identifier).toBe("T-QR-1");
    });
  });

  // =========================================================================
  // 2. Valid Room QR Resolution & Data Leakage Prevention
  // =========================================================================
  describe("2. Valid Room QR Resolution & Data Leakage Prevention", () => {
    it("should resolve a valid active room QR without leaking private guest or folio data", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/public/qr-context/${validRoomToken}`,
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.success).toBe(true);
      expect(json.data.type).toBe("ROOM");
      expect(json.data.identifier).toBe("305");
      expect(json.data.displayName).toBe("Room 305");
      expect(json.data.locationDetails.floor).toBe("3rd Floor");
      expect(json.data.subtext).toBe("3rd Floor");
      expect(json.data.isActive).toBe(true);

      // CRITICAL SECURITY CHECKS: Zero leakage of private hotel/guest data
      const payloadStr = res.payload;
      expect(payloadStr).not.toContain("Secret Private Guest");
      expect(payloadStr).not.toContain("FOLIO-CLASSIFIED-9999");
      expect(payloadStr).not.toContain("guestName");
      expect(payloadStr).not.toContain("folioId");
      expect(payloadStr).not.toContain(TEST_TENANT_A);
      expect(payloadStr).not.toContain("tenantId");
      expect(payloadStr).not.toContain("passwordHash");
    });
  });

  // =========================================================================
  // 3. Invalid, Malformed, and Non-Existent Tokens
  // =========================================================================
  describe("3. Invalid, Malformed, and Non-Existent Tokens", () => {
    it("should return HTTP 404 for a non-existent token", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/public/qr-context/non-existent-token-xyz-999",
      });

      expect(res.statusCode).toBe(404);
      const json = res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("QR_NOT_FOUND");
    });

    it("should return HTTP 400 for a token that is too short (< 3 characters)", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/public/qr-context/ab",
      });

      expect(res.statusCode).toBe(400);
      const json = res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("VALIDATION_FAILED");
    });

    it("should return HTTP 400 for a malformed token containing illegal characters", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/public/qr-context/bad%20token%3Cscript%3E",
      });

      expect(res.statusCode).toBe(400);
      const json = res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("VALIDATION_FAILED");
    });
  });

  // =========================================================================
  // 4. Inactive, Revoked, and Mismatched Records
  // =========================================================================
  describe("4. Inactive, Revoked, and Mismatched Records", () => {
    it("should return HTTP 400 QR_INACTIVE when QR is deactivated", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/public/qr-context/${inactiveToken}`,
      });

      expect(res.statusCode).toBe(400);
      const json = res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("QR_INACTIVE");
    });

    it("should return HTTP 404 when QR record has missing table assignment", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/public/qr-context/${unassignedToken}`,
      });

      expect(res.statusCode).toBe(404);
      const json = res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("QR_INVALID_ASSIGNMENT");
    });

    it("should return HTTP 404 when QR record has ambiguous (both table and room) assignment", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/public/qr-context/${ambiguousToken}`,
      });

      expect(res.statusCode).toBe(404);
      const json = res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("QR_INVALID_ASSIGNMENT");
    });
  });

  // =========================================================================
  // 5. Cross-Tenant Boundary Enforcement
  // =========================================================================
  describe("5. Cross-Tenant Boundary Enforcement", () => {
    it("should reject cross-tenant table mismatch and never leak tenant information", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/public/qr-context/${crossTenantToken}`,
      });

      expect(res.statusCode).toBe(404);
      const json = res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("QR_INVALID_ASSIGNMENT");

      // Verify no leak of Tenant B or foreign table identifiers
      expect(res.payload).not.toContain(TEST_TENANT_B);
      expect(res.payload).not.toContain("T-FOREIGN-1");
    });
  });

  // =========================================================================
  // 6. Rate Limiting Protection
  // =========================================================================
  describe("6. Rate Limiting Protection", () => {
    it("should enforce HTTP 429 when rate limit threshold is exceeded", async () => {
      // 1st request -> 200 OK
      const res1 = await app.inject({
        method: "GET",
        url: "/api/v1/public/test-rate-limit-qr",
      });
      expect(res1.statusCode).toBe(200);

      // 2nd request -> 200 OK
      const res2 = await app.inject({
        method: "GET",
        url: "/api/v1/public/test-rate-limit-qr",
      });
      expect(res2.statusCode).toBe(200);

      // 3rd request -> 429 Rate Limit Exceeded
      const res3 = await app.inject({
        method: "GET",
        url: "/api/v1/public/test-rate-limit-qr",
      });
      expect(res3.statusCode).toBe(429);
      const json = res3.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  // =========================================================================
  // 7. Security Invariant: Staff Routes Authentication Preserved
  // =========================================================================
  describe("7. Security Invariant: Staff Routes Authentication Preserved", () => {
    it("should continue requiring JWT authentication on menu management routes", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/menu/categories",
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().success).toBe(false);
      expect(res.json().error.code).toBe("UNAUTHORIZED");
    });

    it("should continue requiring JWT authentication on auth protected routes", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
      });

      expect(res.statusCode).toBe(401);
      expect(res.json().success).toBe(false);
      expect(res.json().error.code).toBe("UNAUTHORIZED");
    });
  });
});
