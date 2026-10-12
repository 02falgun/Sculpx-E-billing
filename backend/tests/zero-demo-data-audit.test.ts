import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { buildApp } from "../src/app.js";
import type { FastifyInstance } from "fastify";
import { hashPassword } from "../src/lib/password.js";

describe("Zero-Demo-Data Clean State & Tenant Invariant Tests", () => {
  let app: FastifyInstance;
  const PILOT_TENANT_ID = "e1b1d1f0-0000-4000-8000-000000000001";

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("1. Pilot tenant must exist with clean profile", async () => {
    const tenant = await prisma.tenant.findUnique({
      where: { id: PILOT_TENANT_ID },
    });
    expect(tenant).toBeDefined();
    expect(tenant?.id).toBe(PILOT_TENANT_ID);
    expect(tenant?.isActive).toBe(true);
  });

  it("2. Zero demo staff accounts (@demo.com) must exist in database", async () => {
    const demoAccounts = await prisma.user.count({
      where: { email: { contains: "@demo.com" } },
    });
    expect(demoAccounts).toBe(0);
  });

  it("3. Zero seeded employee accounts (waiters, cooks, cashiers, managers) must exist", async () => {
    const employees = await prisma.user.count({
      where: {
        tenantId: PILOT_TENANT_ID,
        role: { notIn: ["ADMIN", "SUPER_ADMIN"] },
      },
    });
    expect(employees).toBe(0);
  });

  it("4. Exactly authoritative Super Admin and Hotel Admin accounts remain", async () => {
    const users = await prisma.user.findMany({
      where: { tenantId: PILOT_TENANT_ID },
      select: { email: true, role: true },
    });
    expect(users.length).toBe(2);
    const emails = users.map((u) => u.email);
    expect(emails).toContain("superadmin@ebilling.com");
    expect(emails).toContain("admin@ebilling.com");
  });

  it("5. Zero fake tables or rooms exist on clean onboarding", async () => {
    const [tables, rooms, qrCodes] = await Promise.all([
      prisma.table.count({ where: { tenantId: PILOT_TENANT_ID } }),
      prisma.room.count({ where: { tenantId: PILOT_TENANT_ID } }),
      prisma.qrCode.count({ where: { tenantId: PILOT_TENANT_ID } }),
    ]);
    expect(tables).toBe(0);
    expect(rooms).toBe(0);
    expect(qrCodes).toBe(0);
  });

  it("6. Zero fake menu categories or dishes exist", async () => {
    const [categories, items] = await Promise.all([
      prisma.menuCategory.count({ where: { tenantId: PILOT_TENANT_ID } }),
      prisma.menuItem.count({ where: { category: { tenantId: PILOT_TENANT_ID } } }),
    ]);
    expect(categories).toBe(0);
    expect(items).toBe(0);
  });

  it("7. Zero fake orders, KOTs, bills, or payments exist", async () => {
    const [orders, kots, bills, payments] = await Promise.all([
      prisma.order.count({ where: { tenantId: PILOT_TENANT_ID } }),
      prisma.kot.count({ where: { order: { tenantId: PILOT_TENANT_ID } } }),
      prisma.bill.count({ where: { tenantId: PILOT_TENANT_ID } }),
      prisma.payment.count({ where: { tenantId: PILOT_TENANT_ID } }),
    ]);
    expect(orders).toBe(0);
    expect(kots).toBe(0);
    expect(bills).toBe(0);
    expect(payments).toBe(0);
  });

  it("8. Zero fake hardware printers or print jobs exist", async () => {
    const [printers, printJobs] = await Promise.all([
      prisma.printer.count({ where: { tenantId: PILOT_TENANT_ID } }),
      prisma.printJob.count({ where: { tenantId: PILOT_TENANT_ID } }),
    ]);
    expect(printers).toBe(0);
    expect(printJobs).toBe(0);
  });

  it("9. Zero fake inventory items or transactions exist", async () => {
    const [invItems, invTx] = await Promise.all([
      prisma.inventoryItem.count({ where: { tenantId: PILOT_TENANT_ID } }),
      prisma.inventoryTransaction.count({ where: { tenantId: PILOT_TENANT_ID } }),
    ]);
    expect(invItems).toBe(0);
    expect(invTx).toBe(0);
  });

  it("10. Hotel Admin can authenticate and obtain valid JWT", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "admin@ebilling.com",
        pinOrPassword: process.env.PILOT_PASSWORD_ADMIN || "demo-secure-pass",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.token).toBeDefined();
    expect(body.data.user.role).toBe("ADMIN");
  });

  it("11. Super Admin bootstrap capability is functional", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "superadmin@ebilling.com",
        pinOrPassword: process.env.PILOT_PASSWORD_SUPER_ADMIN || "demo-secure-pass",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.data.token).toBeDefined();
    expect(body.data.user.role).toBe("SUPER_ADMIN");
  });

  it("12. Role permissions and tenant boundaries are strictly enforced", async () => {
    const adminLogin = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: {
        email: "admin@ebilling.com",
        pinOrPassword: process.env.PILOT_PASSWORD_ADMIN || "demo-secure-pass",
      },
    });
    const token = JSON.parse(adminLogin.payload).data.token;

    // Hotel Admin cannot onboard a platform tenant (Super Admin only)
    const forbiddenRes = await app.inject({
      method: "POST",
      url: "/api/v1/tenants/onboard",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "Unauthorized Tenant",
        code: "unauth-hotel",
      },
    });
    expect(forbiddenRes.statusCode).toBe(403);
  });
});
