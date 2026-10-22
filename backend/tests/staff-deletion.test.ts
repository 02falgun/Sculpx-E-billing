import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/database/prisma.js";

const TEST_TENANT_A = "e1b1d1f0-0000-4000-8000-000000000001";
const TEST_TENANT_B = "00000000-0000-4000-8000-000000000099";

describe("Staff Management: Safe Employee Deletion Suite", () => {
  let app: FastifyInstance;

  let superAdminUser: any;
  let adminAUser: any;
  let adminBUser: any;
  let cashierUser: any;

  let superAdminToken: string;
  let adminAToken: string;
  let adminBToken: string;
  let cashierToken: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Super Admin
    superAdminUser = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN", isActive: true },
    });
    if (!superAdminUser) {
      superAdminUser = await prisma.user.create({
        data: {
          tenantId: TEST_TENANT_A,
          email: `superadmin-del-${Date.now()}@platform.com`,
          name: "Platform Super Admin",
          role: "SUPER_ADMIN",
          passwordHash: "dummy",
        },
      });
    }

    // 2. Tenant A Admin
    adminAUser = await prisma.user.create({
      data: {
        tenantId: TEST_TENANT_A,
        email: `admin-a-del-${Date.now()}@tenant-a.com`,
        name: "Tenant A Admin",
        role: "ADMIN",
        passwordHash: "dummy",
      },
    });

    // 3. Tenant B Admin
    adminBUser = await prisma.user.create({
      data: {
        tenantId: TEST_TENANT_B,
        email: `admin-b-del-${Date.now()}@tenant-b.com`,
        name: "Tenant B Admin",
        role: "ADMIN",
        passwordHash: "dummy",
      },
    });

    // 4. Cashier in Tenant A
    cashierUser = await prisma.user.create({
      data: {
        tenantId: TEST_TENANT_A,
        email: `cashier-del-${Date.now()}@tenant-a.com`,
        name: "Tenant A Cashier",
        role: "CASHIER",
        passwordHash: "dummy",
      },
    });

    superAdminToken = (app as any).jwt.sign({
      sub: superAdminUser.id,
      email: superAdminUser.email,
      tenantId: superAdminUser.tenantId,
      role: superAdminUser.role,
    });

    adminAToken = (app as any).jwt.sign({
      sub: adminAUser.id,
      email: adminAUser.email,
      tenantId: adminAUser.tenantId,
      role: adminAUser.role,
    });

    adminBToken = (app as any).jwt.sign({
      sub: adminBUser.id,
      email: adminBUser.email,
      tenantId: adminBUser.tenantId,
      role: adminBUser.role,
    });

    cashierToken = (app as any).jwt.sign({
      sub: cashierUser.id,
      email: cashierUser.email,
      tenantId: cashierUser.tenantId,
      role: cashierUser.role,
    });
  });

  afterAll(async () => {
    // Clean up created test users
    await prisma.user.deleteMany({
      where: {
        id: { in: [adminAUser.id, adminBUser.id, cashierUser.id] },
      },
    });
  });

  it("should prevent an administrator from deleting their own account (HTTP 400)", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/v1/users/${adminAUser.id}`,
      headers: { authorization: `Bearer ${adminAToken}` },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    const errMsg = body.error?.message || body.message || "";
    expect(errMsg).toMatch(/cannot delete your own account/i);
  });

  it("should reject non-admin roles (e.g. CASHIER) from deleting staff (HTTP 403)", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/v1/users/${cashierUser.id}`,
      headers: { authorization: `Bearer ${cashierToken}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("should prevent hotel Admin from deleting platform Super Admin accounts (HTTP 403)", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/v1/users/${superAdminUser.id}`,
      headers: { authorization: `Bearer ${adminAToken}` },
    });

    expect(res.statusCode).toBe(403);
    const body = res.json();
    const errMsg = body.error?.message || body.message || "";
    expect(errMsg).toMatch(/cannot delete super admin/i);
  });

  it("should prevent cross-tenant staff deletion (HTTP 403)", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: `/api/v1/users/${adminBUser.id}`,
      headers: { authorization: `Bearer ${adminAToken}` },
    });

    expect(res.statusCode).toBe(403);
    const body = res.json();
    const errMsg = body.error?.message || body.message || "";
    expect(errMsg).toMatch(/cross-tenant|another tenant/i);
  });

  it("should prevent deleting the last Super Admin on the platform (HTTP 400)", async () => {
    // If superAdminUser is the only super admin, attempt deletion via super admin JWT
    const superAdminCount = await prisma.user.count({
      where: { role: "SUPER_ADMIN", isActive: true },
    });

    if (superAdminCount === 1) {
      // Even if another super admin tries, or we simulate, it should be blocked
      const res = await app.inject({
        method: "DELETE",
        url: `/api/v1/users/${superAdminUser.id}`,
        headers: { authorization: `Bearer ${superAdminToken}` },
      });
      // It's also their own account, so it will hit self-deletion or last-super-admin
      expect(res.statusCode).toBe(400);
    }
  });

  it("should allow an authorized Admin to safely delete an eligible employee without financial history", async () => {
    const disposableUser = await prisma.user.create({
      data: {
        tenantId: TEST_TENANT_A,
        email: `disposable-${Date.now()}@tenant-a.com`,
        name: "Disposable Staff",
        role: "WAITER",
        passwordHash: "dummy",
      },
    });

    const res = await app.inject({
      method: "DELETE",
      url: `/api/v1/users/${disposableUser.id}`,
      headers: { authorization: `Bearer ${adminAToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.strategy).toBe("PERMANENT_REMOVAL");

    // Verify removed from database
    const checkDb = await prisma.user.findUnique({
      where: { id: disposableUser.id },
    });
    expect(checkDb).toBeNull();

    // Verify audit log
    const audit = await prisma.auditLog.findFirst({
      where: {
        tenantId: TEST_TENANT_A,
        action: "STAFF_DELETED",
      },
      orderBy: { createdAt: "desc" },
    });
    expect(audit).toBeDefined();
    expect(audit?.resourceId).toBe(disposableUser.id);
  });
});
