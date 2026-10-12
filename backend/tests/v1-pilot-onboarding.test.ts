import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";

describe("SCULPX E-Billing — V1 Pilot Hotel Onboarding & Granular RBAC Verification", { timeout: 30000 }, () => {
  let app: FastifyInstance;
  const testTenantCode = `PILOT-${Date.now().toString().slice(-6)}`;
  let testTenantId: string;
  let adminToken: string;
  let waiterToken: string;
  let waiterUserId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    // Isolated cleanup of ONLY the test tenant created by this suite
    if (testTenantId) {
      await prisma.$transaction(async (tx) => {
        await tx.auditLog.deleteMany({ where: { tenantId: testTenantId } });
        await tx.userPermission.deleteMany({ where: { user: { tenantId: testTenantId } } });
        await tx.user.deleteMany({ where: { tenantId: testTenantId } });
        await tx.room.deleteMany({ where: { tenantId: testTenantId } });
        await tx.table.deleteMany({ where: { tenantId: testTenantId } });
        await tx.tenant.deleteMany({ where: { id: testTenantId } });
      });
    }
    await app.close();
  });

  it("Step 1: Onboard a new hotel tenant without inheriting demo rooms, tables, or menu data", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tenants/onboard",
      headers: {
        "x-bootstrap-token": process.env.BOOTSTRAP_SECRET || "sculpx-pilot-bootstrap-token-2026",
      },
      payload: {
        name: "Sculpx Heritage Grand Resort",
        code: testTenantCode,
        timezone: "Asia/Kolkata",
        currency: "INR",
        gstin: "27AABCS9999Z1Z",
        cgstRate: 2.5,
        sgstRate: 2.5,
        serviceChargeRate: 5.0,
        hasAccommodation: true,
        hasRestaurant: true,
        adminName: "General Manager",
        adminEmail: `admin.${testTenantCode.toLowerCase()}@sculpxpilot.internal`,
        adminPassword: "PilotSecureAdmin2026!",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.tenant.name).toBe("Sculpx Heritage Grand Resort");
    expect(body.data.tenant.code).toBe(testTenantCode);
    expect(body.data.adminUser.role).toBe("ADMIN");

    testTenantId = body.data.tenant.id;
  });

  it("Step 2: Confirm new hotel starts completely empty (zero rooms, tables, or orders)", async () => {
    // Check tables count
    const tableCount = await prisma.table.count({ where: { tenantId: testTenantId } });
    expect(tableCount).toBe(0);

    // Check rooms count
    const roomCount = await prisma.room.count({ where: { tenantId: testTenantId } });
    expect(roomCount).toBe(0);

    // Check menu categories count
    const categoryCount = await prisma.menuCategory.count({ where: { tenantId: testTenantId } });
    expect(categoryCount).toBe(0);

    // Check menu items count
    const itemCount = await prisma.menuItem.count({ where: { category: { tenantId: testTenantId } } });
    expect(itemCount).toBe(0);

    // Check orders count
    const orderCount = await prisma.order.count({ where: { tenantId: testTenantId } });
    expect(orderCount).toBe(0);
  });

  it("Step 3: Admin authenticates securely and receives valid token and permissions", async () => {
    const loginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: `admin.${testTenantCode.toLowerCase()}@sculpxpilot.internal`,
        pinOrPassword: "PilotSecureAdmin2026!",
      },
    });

    expect(loginRes.statusCode).toBe(200);
    const loginBody = loginRes.json();
    expect(loginBody.success).toBe(true);
    expect(loginBody.data.user.role).toBe("ADMIN");
    expect(loginBody.data.token).toBeDefined();

    adminToken = loginBody.data.token;
  });

  it("Step 4: Check truthful Pilot Readiness endpoint returns incomplete status for new tenant", async () => {
    const readinessRes = await app.inject({
      method: "GET",
      url: "/api/v1/tenants/readiness",
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(readinessRes.statusCode).toBe(200);
    const body = readinessRes.json();
    expect(body.success).toBe(true);
    expect(body.data.readiness.isPilotReady).toBe(false);
    expect(body.data.metrics.tablesCount).toBe(0);
    expect(body.data.metrics.roomsCount).toBe(0);
    expect(body.data.metrics.menuItemsCount).toBe(0);
  });

  it("Step 5: Admin configures restaurant dining table with unique QR code", async () => {
    const tableRes = await app.inject({
      method: "POST",
      url: "/api/v1/tables",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        tableNumber: "T-01",
        displayName: "Heritage Courtyard 1",
        capacity: 4,
        section: "Courtyard",
      },
    });

    expect(tableRes.statusCode).toBe(201);
    const body = tableRes.json();
    expect(body.success).toBe(true);
    expect(body.data.tableNumber).toBe("T-01");
    expect(body.data.qrToken).toBeDefined();

    // Verify duplicate table in same tenant is rejected
    const dupRes = await app.inject({
      method: "POST",
      url: "/api/v1/tables",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        tableNumber: "T-01",
        displayName: "Duplicate T-01",
        capacity: 2,
        section: "Courtyard",
      },
    });
    expect(dupRes.statusCode).toBe(409);
  });

  it("Step 6: Admin configures hotel room with unique QR code", async () => {
    const roomRes = await app.inject({
      method: "POST",
      url: "/api/v1/rooms",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        roomNumber: "101",
        floor: "1st Floor",
        roomType: "Royal Heritage Suite",
        capacity: 2,
      },
    });

    expect(roomRes.statusCode).toBe(201);
    const body = roomRes.json();
    expect(body.success).toBe(true);
    expect(body.data.roomNumber).toBe("101");
    expect(body.data.qrToken).toBeDefined();

    // Verify duplicate room in same tenant is rejected
    const dupRes = await app.inject({
      method: "POST",
      url: "/api/v1/rooms",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        roomNumber: "101",
        floor: "1st Floor",
      },
    });
    expect(dupRes.statusCode).toBe(409);
  });

  it("Step 7: Admin rotates table QR code; old token is changed and persisted", async () => {
    const tablesList = await app.inject({
      method: "GET",
      url: "/api/v1/tables",
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const table = tablesList.json().data[0];
    const initialQr = table.qrToken;

    const rotateRes = await app.inject({
      method: "POST",
      url: `/api/v1/tables/${table.id}/qr/rotate`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(rotateRes.statusCode).toBe(200);
    const rotatedToken = rotateRes.json().data.qrToken;
    expect(rotatedToken).not.toBe(initialQr);

    // Verify persisted
    const activeQr = await prisma.qrCode.findFirst({
      where: { tableId: table.id, isActive: true },
    });
    expect(activeQr?.token).toBe(rotatedToken);
  });

  it("Step 8: Admin creates a staff member (Waiter) with granular permissions", async () => {
    const staffRes = await app.inject({
      method: "POST",
      url: "/api/v1/users",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        name: "Vikram Waiter",
        email: `waiter.${testTenantCode.toLowerCase()}@sculpxpilot.internal`,
        password: "WaiterPassword123!",
        role: "WAITER",
        permissions: ["tables.view", "orders.view", "orders.create"],
      },
    });

    expect(staffRes.statusCode).toBe(201);
    const body = staffRes.json();
    expect(body.success).toBe(true);
    waiterUserId = body.data.id;
    expect(body.data.role).toBe("WAITER");
  });

  it("Step 9: Waiter authenticates and receives permissions; session revocation terminates access immediately", async () => {
    // 1. Waiter logs in
    const waiterLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: `waiter.${testTenantCode.toLowerCase()}@sculpxpilot.internal`,
        pinOrPassword: "WaiterPassword123!",
      },
    });
    expect(waiterLogin.statusCode).toBe(200);
    waiterToken = waiterLogin.json().data.token;

    // 2. Waiter accesses allowed endpoint
    const canAccess = await app.inject({
      method: "GET",
      url: "/api/v1/tables",
      headers: { authorization: `Bearer ${waiterToken}` },
    });
    expect(canAccess.statusCode).toBe(200);

    // 3. Waiter cannot access Admin endpoint (RBAC boundary check)
    const cannotAccessAdmin = await app.inject({
      method: "POST",
      url: "/api/v1/tables",
      headers: { authorization: `Bearer ${waiterToken}` },
      payload: { tableNumber: "T-99", capacity: 2, section: "Bar" },
    });
    expect(cannotAccessAdmin.statusCode).toBe(403);

    // 4. Admin revokes Waiter sessions
    const revokeRes = await app.inject({
      method: "POST",
      url: `/api/v1/users/${waiterUserId}/revoke-sessions`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(revokeRes.statusCode).toBe(200);

    // 5. Waiter's old token is rejected by auth middleware
    const rejectedReq = await app.inject({
      method: "GET",
      url: "/api/v1/tables",
      headers: { authorization: `Bearer ${waiterToken}` },
    });
    expect(rejectedReq.statusCode).toBe(401);
    expect(rejectedReq.json().error.code).toBe("SESSION_REVOKED");
  });

  it("Step 10: Verify multi-tenant isolation: Tenant cannot access another tenant's data", async () => {
    // Attempt to access demo tenant tables using pilot admin token with forged param
    const crossTenantAttempt = await app.inject({
      method: "GET",
      url: "/api/v1/tables?tenantId=e1b1d1f0-0000-4000-8000-000000000001",
      headers: { authorization: `Bearer ${adminToken}` },
    });

    // Server must strictly scope to caller's authenticated tenant
    expect(crossTenantAttempt.statusCode).toBe(200);
    const tables = crossTenantAttempt.json().data;
    // Should ONLY return the pilot tenant's table (T-01), NOT the 34 demo tables
    expect(tables.length).toBe(1);
    expect(tables[0].tableNumber).toBe("T-01");
  });

  it("Step 11: Verify audit log records sensitive operations", async () => {
    const auditRes = await app.inject({
      method: "GET",
      url: "/api/v1/audit?limit=20",
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(auditRes.statusCode).toBe(200);
    const body = auditRes.json();
    expect(body.success).toBe(true);
    expect(body.data.total).toBeGreaterThan(0);

    const actions = body.data.logs.map((l: any) => l.action);
    expect(actions).toContain("TABLE_CREATED");
    expect(actions).toContain("ROOM_CREATED");
    expect(actions).toContain("STAFF_CREATED");
    expect(actions).toContain("STAFF_SESSIONS_REVOKED");
  });
});
