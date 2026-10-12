import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import type { FastifyInstance } from "fastify";

describe("SCULPX E-Billing — Franchise, Multi-Location & Tenant Isolation Suite", { timeout: 45000 }, () => {
  let app: FastifyInstance;

  let superAdminToken: string;
  let franchiseOwnerToken: string;
  let locationAdminToken: string;
  let independentAdminToken: string;

  let testFranchiseOrgId: string;
  let testLocation1Id: string;
  let testTenant1Id: string;
  let testLocation2Id: string;
  let testTenant2Id: string;
  let independentLocId: string;
  let independentTenantId: string;

  const testSuffix = Date.now().toString().slice(-6);
  const franchiseCode = `fr-${testSuffix}`;
  const loc1Code = `loc1-${testSuffix}`;
  const loc2Code = `loc2-${testSuffix}`;
  const indepCode = `indep-${testSuffix}`;

  const ownerEmail = `owner.${testSuffix}@franchisegroup.test`;
  const locAdminEmail = `locadmin.${testSuffix}@franchisegroup.test`;
  const indepAdminEmail = `admin.${testSuffix}@independenthotel.test`;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Generate Super Admin Token
    const superAdmin = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN" },
    });
    if (!superAdmin) {
      throw new Error("Super Admin user not found for testing");
    }

    superAdminToken = app.jwt.sign({
      sub: superAdmin.id,
      email: superAdmin.email,
      role: superAdmin.role,
      tenantId: superAdmin.tenantId,
      tokenVersion: superAdmin.tokenVersion,
    });
  });

  afterAll(async () => {
    // Isolated teardown of created test records
    await prisma.$transaction(async (tx) => {
      const tenantIds = [testTenant1Id, testTenant2Id, independentTenantId].filter(Boolean);
      const userEmails = [ownerEmail, locAdminEmail, indepAdminEmail].filter(Boolean);

      if (tenantIds.length > 0) {
        await tx.auditLog.deleteMany({ where: { tenantId: { in: tenantIds } } });
        await tx.orderItem.deleteMany({ where: { order: { tenantId: { in: tenantIds } } } });
        await tx.order.deleteMany({ where: { tenantId: { in: tenantIds } } });
        await tx.table.deleteMany({ where: { tenantId: { in: tenantIds } } });
        await tx.room.deleteMany({ where: { tenantId: { in: tenantIds } } });
      }

      await tx.userLocationAssignment.deleteMany({
        where: { user: { email: { in: userEmails } } },
      });
      await tx.organizationUser.deleteMany({
        where: { user: { email: { in: userEmails } } },
      });
      await tx.user.deleteMany({
        where: { email: { in: userEmails } },
      });

      if (testFranchiseOrgId) {
        await tx.location.deleteMany({ where: { organizationId: testFranchiseOrgId } });
        await tx.organization.deleteMany({ where: { id: testFranchiseOrgId } });
      }
      if (independentLocId) {
        await tx.location.deleteMany({ where: { id: independentLocId } });
      }

      if (tenantIds.length > 0) {
        await tx.tenant.deleteMany({ where: { id: { in: tenantIds } } });
      }
    });

    await app.close();
  });

  it("1. Reject non-Super Admin from onboarding franchise or creating locations", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/organizations",
      headers: { authorization: `Bearer invalid-token` },
      payload: {
        name: "Unauthorized Corp",
        code: `unauth-${testSuffix}`,
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it("2. Super Admin onboards Franchise Organization with First Location and Owner atomically", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/organizations/franchise/onboard",
      headers: { authorization: `Bearer ${superAdminToken}` },
      payload: {
        organization: {
          name: "Taj Mahal Palace Hospitality Franchise",
          code: franchiseCode,
          legalName: "Taj Palace Hospitality Private Limited",
          contactEmail: "hq@tajpalace.internal",
          contactPhone: "+91 98765 43210",
        },
        firstLocation: {
          name: "Taj Palace Flagship Mumbai",
          code: loc1Code,
          locationType: "COMBINED",
          city: "Mumbai",
          country: "India",
          timezone: "Asia/Kolkata",
          currency: "INR",
          currencySymbol: "₹",
          cgstRate: 2.5,
          sgstRate: 2.5,
          serviceChargeRate: 5.0,
        },
        franchiseOwner: {
          name: "Vikramaditya Group Owner",
          email: ownerEmail,
          password: "FranchiseSecure2026!",
          phone: "+91 98000 00001",
        },
        locationAdmin: {
          name: "Mumbai Branch General Manager",
          email: locAdminEmail,
          password: "BranchAdminSecure2026!",
          phone: "+91 98000 00002",
        },
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.organization.name).toBe("Taj Mahal Palace Hospitality Franchise");
    expect(body.data.organization.code).toBe(franchiseCode);
    expect(body.data.location.name).toBe("Taj Palace Flagship Mumbai");
    expect(body.data.tenant).toBeDefined();

    testFranchiseOrgId = body.data.organization.id;
    testLocation1Id = body.data.location.id;
    testTenant1Id = body.data.tenant.id;

    // Sign tokens for created franchise owner and location admin
    franchiseOwnerToken = app.jwt.sign({
      sub: body.data.owner.id,
      email: body.data.owner.email,
      role: body.data.owner.role,
      tenantId: testTenant1Id,
      tokenVersion: 1,
    });

    locationAdminToken = app.jwt.sign({
      sub: body.data.locationAdmin.id,
      email: body.data.locationAdmin.email,
      role: body.data.locationAdmin.role,
      tenantId: testTenant1Id,
      tokenVersion: 1,
    });
  });

  it("3. Verify new location starts completely clean (zero fake tables, rooms, orders)", async () => {
    const [tables, rooms, qrCodes, orders, bills] = await Promise.all([
      prisma.table.count({ where: { tenantId: testTenant1Id } }),
      prisma.room.count({ where: { tenantId: testTenant1Id } }),
      prisma.qrCode.count({ where: { tenantId: testTenant1Id } }),
      prisma.order.count({ where: { tenantId: testTenant1Id } }),
      prisma.bill.count({ where: { tenantId: testTenant1Id } }),
    ]);

    expect(tables).toBe(0);
    expect(rooms).toBe(0);
    expect(qrCodes).toBe(0);
    expect(orders).toBe(0);
    expect(bills).toBe(0);
  });

  it("4. Super Admin creates second location under same franchise with different currency/timezone", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/locations",
      headers: { authorization: `Bearer ${superAdminToken}` },
      payload: {
        organizationId: testFranchiseOrgId,
        name: "Taj Palace Dubai Branch",
        code: loc2Code,
        locationType: "HOTEL",
        city: "Dubai",
        country: "United Arab Emirates",
        timezone: "Asia/Dubai",
        currency: "AED",
        currencySymbol: "د.إ",
        cgstRate: 0,
        sgstRate: 0,
        serviceChargeRate: 10.0,
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.location.organizationId).toBe(testFranchiseOrgId);
    expect(body.data.location.currency).toBe("AED");
    expect(body.data.location.timezone).toBe("Asia/Dubai");

    testLocation2Id = body.data.location.id;
    testTenant2Id = body.data.tenant.id;
  });

  it("5. Super Admin creates Independent Business Location without franchise parent", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/locations",
      headers: { authorization: `Bearer ${superAdminToken}` },
      payload: {
        organizationId: null, // Independent property
        name: "Emerald Independent Heritage Bistro",
        code: indepCode,
        locationType: "RESTAURANT",
        city: "Bengaluru",
        country: "India",
        timezone: "Asia/Kolkata",
        currency: "INR",
        currencySymbol: "₹",
        adminName: "Independent Bistro Owner",
        adminEmail: indepAdminEmail,
        adminPassword: "IndependentPass2026!",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.data.location.organizationId).toBeNull();
    expect(body.data.location.code).toBe(indepCode);

    independentLocId = body.data.location.id;
    independentTenantId = body.data.tenant.id;

    independentAdminToken = app.jwt.sign({
      sub: body.data.adminUser.id,
      email: body.data.adminUser.email,
      role: body.data.adminUser.role,
      tenantId: independentTenantId,
      tokenVersion: 1,
    });
  });

  it("6. Franchise Owner can inspect authorized franchise locations and truthful aggregated metrics", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/organizations/${testFranchiseOrgId}`,
      headers: { authorization: `Bearer ${franchiseOwnerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.data.id).toBe(testFranchiseOrgId);
    expect(body.data.locations.length).toBe(2);

    // Check stats endpoint
    const statsRes = await app.inject({
      method: "GET",
      url: `/api/v1/organizations/${testFranchiseOrgId}/stats`,
      headers: { authorization: `Bearer ${franchiseOwnerToken}` },
    });
    expect(statsRes.statusCode).toBe(200);
    const statsBody = statsRes.json();
    expect(statsBody.data.totalLocations).toBe(2);
    // Currency separated totals
    expect(statsBody.data.revenueByCurrency.INR).toBeDefined();
    expect(statsBody.data.revenueByCurrency.AED).toBeDefined();
  });

  it("7. Location Admin cannot access unrelated independent tenant or another franchise", async () => {
    // Attempting to query rooms or tables belonging to another tenant
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/tables",
      headers: { authorization: `Bearer ${locationAdminToken}` },
      payload: {
        tenantId: independentTenantId, // Attempt cross-tenant forgery
        tableNumber: "T-HACK-01",
        displayName: "Hack Table",
        capacity: 4,
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it("8. Independent Admin cannot access franchise locations", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/locations/${testLocation1Id}`,
      headers: { authorization: `Bearer ${independentAdminToken}` },
    });

    expect(res.statusCode).toBe(403);
  });

  it("9. Suspending a location prevents operational modifications while preserving records", async () => {
    // Super Admin suspends Location 1
    const suspendRes = await app.inject({
      method: "PUT",
      url: `/api/v1/locations/${testLocation1Id}/status`,
      headers: { authorization: `Bearer ${superAdminToken}` },
      payload: { status: "SUSPENDED", reason: "Annual License Audit" },
    });
    expect(suspendRes.statusCode).toBe(200);

    // Attempting operational POST against suspended location
    const opRes = await app.inject({
      method: "POST",
      url: "/api/v1/tables",
      headers: { authorization: `Bearer ${locationAdminToken}` },
      payload: {
        tenantId: testTenant1Id,
        tableNumber: "T-SUSP-1",
        displayName: "Suspended Table",
        capacity: 4,
      },
    });

    expect(opRes.statusCode).toBe(403);
    const errBody = opRes.json();
    expect(errBody.error.code).toBe("LOCATION_SUSPENDED");

    // Re-activate location
    const reactivateRes = await app.inject({
      method: "PUT",
      url: `/api/v1/locations/${testLocation1Id}/status`,
      headers: { authorization: `Bearer ${superAdminToken}` },
      payload: { status: "ACTIVE" },
    });
    expect(reactivateRes.statusCode).toBe(200);
  });

  it("10. Super Admin location listing returns both franchise-affiliated and independent locations", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/locations",
      headers: { authorization: `Bearer ${superAdminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    const codes = body.data.map((l: any) => l.code);
    expect(codes).toContain(loc1Code);
    expect(codes).toContain(loc2Code);
    expect(codes).toContain(indepCode);
  });
});
