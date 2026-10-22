import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma, disconnectPrisma } from "../src/database/prisma.js";
import { seedDemoUsers, DEFAULT_DEMO_TENANT_ID } from "../src/database/seeds/demo-users.seed.js";
import { hashPassword } from "../src/lib/password.js";

describe("SCULPX E-Billing — Phase 3A Menu Catalog Tests", { timeout: 30000 }, () => {
  let app: FastifyInstance;
  let adminToken: string;
  let waiterToken: string;
  let foreignTenantToken: string;
  const FOREIGN_TENANT_ID = "e1b1d1f0-0000-4000-8000-000000000099";

  beforeAll(async () => {
    await seedDemoUsers();
    app = await buildApp();
    await app.ready();

    // 1. Obtain Admin token
    const adminLoginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "admin@demo.com", password: "demo-secure-pass" },
    });
    adminToken = JSON.parse(adminLoginRes.body).data.token;

    // 2. Obtain Waiter token
    const waiterLoginRes = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: "waiter@demo.com", password: "demo-secure-pass" },
    });
    waiterToken = JSON.parse(waiterLoginRes.body).data.token;

    // 3. Create a foreign tenant user and token for cross-tenant testing
    const foreignEmail = `foreign-admin-${Date.now()}@test.com`;
    const foreignUser = await prisma.user.create({
      data: {
        tenantId: FOREIGN_TENANT_ID,
        email: foreignEmail,
        name: "Foreign Admin",
        role: "ADMIN",
        isActive: true,
        passwordHash: await hashPassword("testpass"),
      },
    });

    foreignTenantToken = app.jwt.sign({
      sub: foreignUser.id,
      email: foreignUser.email,
      role: foreignUser.role,
      tenantId: foreignUser.tenantId,
    });
  });

  afterAll(async () => {
    // Cleanup foreign user
    await prisma.user.deleteMany({
      where: { tenantId: FOREIGN_TENANT_ID },
    });
    if (app) await app.close();
    await disconnectPrisma();
  });

  describe("1. Authentication & Role Authorization", () => {
    it("should reject unauthenticated access with HTTP 401 UNAUTHORIZED", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/menu/categories",
      });
      expect(res.statusCode).toBe(401);
      expect(JSON.parse(res.body).error.code).toBe("UNAUTHORIZED");
    });

    it("should allow staff (Waiter) to read menu categories and items", async () => {
      const resCategories = await app.inject({
        method: "GET",
        url: "/api/v1/menu/categories",
        headers: { authorization: `Bearer ${waiterToken}` },
      });
      expect(resCategories.statusCode).toBe(200);

      const resItems = await app.inject({
        method: "GET",
        url: "/api/v1/menu/items",
        headers: { authorization: `Bearer ${waiterToken}` },
      });
      expect(resItems.statusCode).toBe(200);
    });

    it("should forbid non-admin roles (Waiter) from mutating categories or items with HTTP 403 FORBIDDEN", async () => {
      const resPostCategory = await app.inject({
        method: "POST",
        url: "/api/v1/menu/categories",
        headers: { authorization: `Bearer ${waiterToken}` },
        payload: { name: "Unauthorized Category" },
      });
      expect(resPostCategory.statusCode).toBe(403);
      expect(JSON.parse(resPostCategory.body).error.code).toBe("FORBIDDEN");

      const resPostItem = await app.inject({
        method: "POST",
        url: "/api/v1/menu/items",
        headers: { authorization: `Bearer ${waiterToken}` },
        payload: {
          categoryId: "00000000-0000-0000-0000-000000000000",
          name: "Unauthorized Item",
          price: 150,
        },
      });
      expect(resPostItem.statusCode).toBe(403);
      expect(JSON.parse(resPostItem.body).error.code).toBe("FORBIDDEN");
    });
  });

  describe("2. Category CRUD & Validation", () => {
    let createdCategoryId: string;

    it("should reject category creation with invalid payload (missing name) with HTTP 400", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/menu/categories",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { description: "Missing name" },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error.code).toBe("VALIDATION_FAILED");
    });

    it("should create a category with valid input and generate a slug in response", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/menu/categories",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: "Gourmet Tandoor & Grills",
          description: "Freshly roasted kebabs and tikkas",
          displayOrder: 10,
          isActive: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe("Gourmet Tandoor & Grills");
      expect(body.data.slug).toBe("gourmet-tandoor-grills");
      expect(body.data.displayOrder).toBe(10);
      expect(body.data.isActive).toBe(true);

      createdCategoryId = body.data.id;
    });

    it("should fetch the category by ID", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/menu/categories/${createdCategoryId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.id).toBe(createdCategoryId);
      expect(body.data.name).toBe("Gourmet Tandoor & Grills");
    });

    it("should update category details", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/menu/categories/${createdCategoryId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: "Royal Tandoor & Grills",
          displayOrder: 5,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.name).toBe("Royal Tandoor & Grills");
      expect(body.data.slug).toBe("royal-tandoor-grills");
      expect(body.data.displayOrder).toBe(5);
    });

    it("should return 404 for non-existent category ID", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/menu/categories/00000000-0000-0000-0000-000000000999",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).error.code).toBe("CATEGORY_NOT_FOUND");
    });
  });

  describe("3. Menu Item CRUD, Decimal Pricing & Modifiers", () => {
    let testCategoryId: string;
    let createdItemId: string;

    beforeAll(async () => {
      // Create a dedicated category for item tests
      const catRes = await app.inject({
        method: "POST",
        url: "/api/v1/menu/categories",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { name: "Starters Testing", displayOrder: 1 },
      });
      testCategoryId = JSON.parse(catRes.body).data.id;
    });

    it("should reject menu item creation with negative price", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/menu/items",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          categoryId: testCategoryId,
          name: "Invalid Dish",
          price: -50,
        },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error.code).toBe("VALIDATION_FAILED");
    });

    it("should reject menu item creation with unknown categoryId", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/menu/items",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          categoryId: "00000000-0000-0000-0000-000000000001",
          name: "Orphan Dish",
          price: 250,
        },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error.code).toBe("INVALID_CATEGORY");
    });

    it("should create a menu item with authoritative decimal price and nested modifier groups", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/menu/items",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          categoryId: testCategoryId,
          name: "Tandoori Malai Chaap",
          description: "Soya chaap marinated in heavy cream, cashews, and mild spices",
          price: 320.5,
          dietaryType: "VEG",
          spiceLevel: "MILD",
          preparationTimeMinutes: 18,
          taxRatePercentage: 5.0,
          modifierGroups: [
            {
              name: "Portion Size",
              isRequired: true,
              minSelections: 1,
              maxSelections: 1,
              options: [
                { name: "Half Portion (4 pcs)", price: 0 },
                { name: "Full Portion (8 pcs)", price: 150 },
              ],
            },
            {
              name: "Accompaniments",
              isRequired: false,
              minSelections: 0,
              maxSelections: 2,
              options: [
                { name: "Extra Mint Chutney", price: 20 },
                { name: "Roomali Roti", price: 35 },
              ],
            },
          ],
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe("Tandoori Malai Chaap");
      expect(body.data.price).toBe(320.5);
      expect(body.data.categoryName).toBe("Starters Testing");
      expect(body.data.dietaryType).toBe("VEG");
      expect(body.data.spiceLevel).toBe("MILD");
      expect(body.data.modifierGroups.length).toBe(2);

      const sizeGroup = body.data.modifierGroups.find((g: any) => g.name === "Portion Size");
      expect(sizeGroup).toBeDefined();
      expect(sizeGroup.isRequired).toBe(true);
      expect(sizeGroup.options.length).toBe(2);

      createdItemId = body.data.id;
    });

    it("should retrieve the created item by ID with modifier hierarchy", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/menu/items/${createdItemId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.id).toBe(createdItemId);
      expect(body.data.modifierGroups).toBeDefined();
      expect(body.data.modifierGroups.length).toBe(2);
    });

    it("should list items with validated pagination and filtering", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/menu/items?categoryId=${testCategoryId}&search=Chaap&page=1&limit=10`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(10);
      expect(body.pagination.totalItems).toBeGreaterThanOrEqual(1);
    });

    it("should update item fields (price and availability)", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/menu/items/${createdItemId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          price: 350.0,
          isAvailable: false,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.price).toBe(350.0);
      expect(body.data.isAvailable).toBe(false);
    });

    it("should safely delete an item when no orders reference it", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/api/v1/menu/items/${createdItemId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);

      // Verify item no longer exists
      const verifyRes = await app.inject({
        method: "GET",
        url: `/api/v1/menu/items/${createdItemId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(verifyRes.statusCode).toBe(404);
    });
  });

  describe("4. Dedicated Modifier Groups and Options Sub-Endpoints", () => {
    let testCatId: string;
    let testItemId: string;
    let testGroupId: string;
    let testOptionId: string;

    beforeAll(async () => {
      const catRes = await app.inject({
        method: "POST",
        url: "/api/v1/menu/categories",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { name: "Modifiers Test Category" },
      });
      testCatId = JSON.parse(catRes.body).data.id;

      const itemRes = await app.inject({
        method: "POST",
        url: "/api/v1/menu/items",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          categoryId: testCatId,
          name: "Customizable Pizza",
          price: 450,
        },
      });
      testItemId = JSON.parse(itemRes.body).data.id;
    });

    it("should add a modifier group to an item", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/menu/items/${testItemId}/modifier-groups`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: "Crust Selection",
          isRequired: true,
          minSelections: 1,
          maxSelections: 1,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.name).toBe("Crust Selection");
      testGroupId = body.data.id;
    });

    it("should add a modifier option to the group", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/menu/modifier-groups/${testGroupId}/options`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: "Cheese Burst",
          price: 80,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.data.name).toBe("Cheese Burst");
      expect(body.data.price).toBe(80);
      testOptionId = body.data.id;
    });

    it("should update a modifier option price", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/menu/modifier-options/${testOptionId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { price: 95 },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).data.price).toBe(95);
    });

    it("should delete a modifier option", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/api/v1/menu/modifier-options/${testOptionId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
    });

    it("should delete a modifier group", async () => {
      const res = await app.inject({
        method: "DELETE",
        url: `/api/v1/menu/modifier-groups/${testGroupId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
    });
  });

  describe("5. Cross-Tenant Isolation & Boundary Enforcement", () => {
    let tenantACategoryId: string;

    beforeAll(async () => {
      // Create Category under Tenant A (Grand Palace)
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/menu/categories",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { name: "Tenant A Private Specials" },
      });
      tenantACategoryId = JSON.parse(res.body).data.id;
    });

    it("should not expose Tenant A category when Tenant B queries categories", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/menu/categories",
        headers: { authorization: `Bearer ${foreignTenantToken}` },
      });

      expect(res.statusCode).toBe(200);
      const categories = JSON.parse(res.body).data;
      const found = categories.find((c: any) => c.id === tenantACategoryId);
      expect(found).toBeUndefined();
    });

    it("should return HTTP 404 when Tenant B attempts to fetch Tenant A category by ID", async () => {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/menu/categories/${tenantACategoryId}`,
        headers: { authorization: `Bearer ${foreignTenantToken}` },
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).error.code).toBe("CATEGORY_NOT_FOUND");
    });

    it("should return HTTP 404 when Tenant B attempts to modify Tenant A category", async () => {
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/menu/categories/${tenantACategoryId}`,
        headers: { authorization: `Bearer ${foreignTenantToken}` },
        payload: { name: "Hijacked Category" },
      });
      expect(res.statusCode).toBe(404);
      expect(JSON.parse(res.body).error.code).toBe("CATEGORY_NOT_FOUND");
    });

    it("should prevent Tenant B from attaching a menu item to Tenant A's category", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/menu/items",
        headers: { authorization: `Bearer ${foreignTenantToken}` },
        payload: {
          categoryId: tenantACategoryId,
          name: "Cross Tenant Attack Item",
          price: 200,
        },
      });
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error.code).toBe("INVALID_CATEGORY");
    });
  });

  describe("6. Safe Deletion & Soft Deactivation Invariant", () => {
    it("should soft-deactivate category if items are associated with it", async () => {
      // 1. Create category
      const catRes = await app.inject({
        method: "POST",
        url: "/api/v1/menu/categories",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { name: "Non-Empty Category Test" },
      });
      const catId = JSON.parse(catRes.body).data.id;

      // 2. Create item in category
      await app.inject({
        method: "POST",
        url: "/api/v1/menu/items",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          categoryId: catId,
          name: "Child Dish",
          price: 180,
        },
      });

      // 3. Attempt to delete category
      const deleteRes = await app.inject({
        method: "DELETE",
        url: `/api/v1/menu/categories/${catId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(deleteRes.statusCode).toBe(200);

      // 4. Verify category is soft-deactivated (isActive = false), not purged
      const verifyRes = await app.inject({
        method: "GET",
        url: `/api/v1/menu/categories/${catId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(verifyRes.statusCode).toBe(200);
      expect(JSON.parse(verifyRes.body).data.isActive).toBe(false);
    });
  });
});
