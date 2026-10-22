import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma, disconnectPrisma } from "../src/database/prisma.js";
import { hashPassword } from "../src/lib/password.js";
import { seedDemoUsers, DEFAULT_DEMO_TENANT_ID } from "../src/database/seeds/demo-users.seed.js";

describe("SCULPX E-Billing — Phase 2 Authentication & Authorization Tests", { timeout: 20000 }, () => {
  let app: FastifyInstance;
  const testPassword = "demo-secure-pass";

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    await disconnectPrisma();
  });

  describe("1. POST /api/v1/auth/login", () => {
    it("should authenticate valid employee credentials and return signed JWT + profile", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "admin@demo.com",
          password: testPassword,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();
      expect(body.data.token).toBeTypeOf("string");
      expect(body.data.token.split(".").length).toBe(3); // Valid JWT structure
      expect(body.data.expiresAt).toBeDefined();

      const user = body.data.user;
      expect(user.email).toBe("admin@demo.com");
      expect(user.role).toBe("ADMIN");
      expect(user.isActive).toBe(true);
      expect(Array.isArray(user.permissions)).toBe(true);
      expect(user.permissions).toContain("all_admin");

      // Critical Security Assertion: Never leak password hash
      expect(user.passwordHash).toBeUndefined();
      expect(user.password_hash).toBeUndefined();
      expect(response.body).not.toContain("passwordHash");
      expect(response.body).not.toContain("password_hash");
    });

    it("should accept pinOrPassword parameter for frontend client compatibility", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "waiter@demo.com",
          pinOrPassword: testPassword,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.user.role).toBe("WAITER");
    });

    it("should reject incorrect password with generic 401 INVALID_CREDENTIALS", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "admin@demo.com",
          password: "completely-wrong-password",
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.data).toBeNull();
      expect(body.error.code).toBe("INVALID_CREDENTIALS");
      expect(body.error.message).toBe("Invalid email or password");
    });

    it("should reject unknown email with generic 401 without revealing account absence", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "nonexistent-user-12345@demo.com",
          password: testPassword,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INVALID_CREDENTIALS");
      // Message must be identical to incorrect password to prevent enumeration
      expect(body.error.message).toBe("Invalid email or password");
    });

    it("should reject deactivated/inactive account with HTTP 403 ACCOUNT_DISABLED", async () => {
      const inactiveEmail = `inactive-test-${Date.now()}@demo.com`;
      const passHash = await hashPassword("inactive-pass");

      // Create temporary inactive user
      const inactiveUser = await prisma.user.create({
        data: {
          tenantId: DEFAULT_DEMO_TENANT_ID,
          email: inactiveEmail,
          name: "Inactive Staff",
          role: "WAITER",
          isActive: false,
          passwordHash: passHash,
        },
      });

      try {
        const response = await app.inject({
          method: "POST",
          url: "/api/v1/auth/login",
          payload: {
            email: inactiveEmail,
            password: "inactive-pass",
          },
        });

        expect(response.statusCode).toBe(403);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(false);
        expect(body.error.code).toBe("ACCOUNT_DISABLED");
        expect(body.error.message).toContain("deactivated");
      } finally {
        await prisma.user.delete({ where: { id: inactiveUser.id } });
      }
    });

    it("should reject malformed input with HTTP 400 VALIDATION_FAILED", async () => {
      // Invalid email syntax
      const res1 = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "not-an-email",
          password: "password123",
        },
      });
      expect(res1.statusCode).toBe(400);
      expect(JSON.parse(res1.body).error.code).toBe("VALIDATION_FAILED");

      // Missing password
      const res2 = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "admin@demo.com",
        },
      });
      expect(res2.statusCode).toBe(400);
      expect(JSON.parse(res2.body).error.code).toBe("VALIDATION_FAILED");
    });

    it("should enforce rate limiting and respond with HTTP 429 RATE_LIMIT_EXCEEDED when threshold exceeded", async () => {
      // 1st request - ok
      const r1 = await app.inject({ method: "POST", url: "/api/v1/auth/test-rate-limit" });
      expect(r1.statusCode).toBe(200);

      // 2nd request - ok (limit = 2)
      const r2 = await app.inject({ method: "POST", url: "/api/v1/auth/test-rate-limit" });
      expect(r2.statusCode).toBe(200);

      // 3rd request - rate limit triggered
      const r3 = await app.inject({ method: "POST", url: "/api/v1/auth/test-rate-limit" });
      expect(r3.statusCode).toBe(429);
      const body = JSON.parse(r3.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(body.error.message).toContain("Rate limit exceeded");
    });
  });

  describe("2. GET /api/v1/auth/me", () => {
    it("should return the current employee profile when supplied with a valid Bearer token", async () => {
      // 1. Log in to get token
      const loginRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "cashier@demo.com",
          password: testPassword,
        },
      });
      const token = JSON.parse(loginRes.body).data.token;

      // 2. Fetch /me
      const meRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      expect(meRes.statusCode).toBe(200);
      const meBody = JSON.parse(meRes.body);
      expect(meBody.success).toBe(true);
      expect(meBody.data.email).toBe("cashier@demo.com");
      expect(meBody.data.role).toBe("CASHIER");
      expect(meBody.data.permissions).toContain("collect_payments");

      // Check security: No password hash exposed
      expect(meBody.data.passwordHash).toBeUndefined();
      expect(meRes.body).not.toContain("passwordHash");
    });

    it("should reject request with HTTP 401 when Authorization header is missing", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("should reject request with HTTP 401 when token has an invalid signature", async () => {
      // Create a forged JWT signed with an untrusted key
      const forgedToken = app.jwt.sign(
        { sub: "usr-forged", email: "hacker@test.com", role: "ADMIN", tenantId: DEFAULT_DEMO_TENANT_ID },
        { key: "unauthorized-different-secret-key-12345" }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: {
          authorization: `Bearer ${forgedToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("should reject request with HTTP 401 when token is expired", async () => {
      // Issue expired token (-10 seconds)
      const expiredToken = app.jwt.sign(
        { sub: "usr-test", email: "admin@demo.com", role: "ADMIN", tenantId: DEFAULT_DEMO_TENANT_ID },
        { expiresIn: -10 }
      );

      const response = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("should reject request with HTTP 403 if user was deactivated after token was issued", async () => {
      const email = `token-invalidation-${Date.now()}@demo.com`;
      const passHash = await hashPassword("testpass");

      const user = await prisma.user.create({
        data: {
          tenantId: DEFAULT_DEMO_TENANT_ID,
          email,
          name: "Revocation Subject",
          role: "WAITER",
          isActive: true,
          passwordHash: passHash,
        },
      });

      try {
        // Issue valid token
        const token = app.jwt.sign({
          sub: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        });

        // Deactivate user in database
        await prisma.user.update({
          where: { id: user.id },
          data: { isActive: false },
        });

        // Attempt /me with token
        const response = await app.inject({
          method: "GET",
          url: "/api/v1/auth/me",
          headers: {
            authorization: `Bearer ${token}`,
          },
        });

        expect(response.statusCode).toBe(403);
        const body = JSON.parse(response.body);
        expect(body.error.code).toBe("ACCOUNT_DISABLED");
      } finally {
        await prisma.user.delete({ where: { id: user.id } });
      }
    });
  });

  describe("3. Role-Based Authorization & Boundary Guards", () => {
    let waiterToken: string;
    let kitchenToken: string;
    let adminToken: string;
    let superAdminToken: string;

    beforeAll(async () => {
      const login = async (email: string) => {
        const res = await app.inject({
          method: "POST",
          url: "/api/v1/auth/login",
          payload: { email, password: testPassword },
        });
        return JSON.parse(res.body).data.token as string;
      };

      waiterToken = await login("waiter@demo.com");
      kitchenToken = await login("kitchen@demo.com");
      adminToken = await login("admin@demo.com");
      superAdminToken = await login("superadmin@demo.com");
    });

    it("should grant access to ADMIN and SUPER_ADMIN on admin-only route", async () => {
      const adminRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/test-admin-only",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(adminRes.statusCode).toBe(200);

      const superRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/test-admin-only",
        headers: { authorization: `Bearer ${superAdminToken}` },
      });
      expect(superRes.statusCode).toBe(200);
    });

    it("should reject unauthorized roles (WAITER, KITCHEN_STAFF) with HTTP 403 FORBIDDEN", async () => {
      const waiterRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/test-admin-only",
        headers: { authorization: `Bearer ${waiterToken}` },
      });
      expect(waiterRes.statusCode).toBe(403);
      const waiterBody = JSON.parse(waiterRes.body);
      expect(waiterBody.error.code).toBe("FORBIDDEN");

      const kitchenRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/test-admin-only",
        headers: { authorization: `Bearer ${kitchenToken}` },
      });
      expect(kitchenRes.statusCode).toBe(403);
      const kitchenBody = JSON.parse(kitchenRes.body);
      expect(kitchenBody.error.code).toBe("FORBIDDEN");
    });

    it("should reject cross-tenant resource manipulation with HTTP 403 FORBIDDEN", async () => {
      const foreignTenantId = "00000000-0000-0000-0000-000000000099";

      // Admin of DEFAULT_DEMO_TENANT attempts to access resource of foreign tenant
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/auth/test-admin-only?tenantId=${foreignTenantId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("FORBIDDEN");
      expect(body.error.message).toContain("Cross-tenant");
    });
  });

  describe("4. Seed Idempotency & Captain Account Verification", () => {
    it("should execute repeatedly without creating duplicate records or changing passwords", async () => {
      const seedResult = await seedDemoUsers();
      expect(seedResult.created).toBe(0);
      expect(seedResult.existing).toBe(7);

      // Verify captain account was created and can log in
      const captainLogin = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "captain@demo.com",
          password: testPassword,
        },
      });

      expect(captainLogin.statusCode).toBe(200);
      const body = JSON.parse(captainLogin.body);
      expect(body.data.user.role).toBe("CAPTAIN");
    });
  });
});
