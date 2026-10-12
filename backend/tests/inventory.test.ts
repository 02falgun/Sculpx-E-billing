import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma, disconnectPrisma } from "../src/lib/prisma.js";
import {
  InventoryUnit,
  InventoryTransactionType,
  OrderStatus,
} from "@prisma/client";
import { convertQuantity, inventoryService } from "../src/services/inventory.service.js";

const TEST_TENANT_A = "e1b1d1f0-0000-4000-8000-000000000001";
const TEST_TENANT_B = "00000000-0000-4000-8000-000000000099";

describe("SCULPX E-Billing — Phase 5: Inventory & Recipe BOM Consumption Suite", { timeout: 60000 }, () => {
  let app: FastifyInstance;

  let adminUser: any;
  let managerUser: any;
  let waiterUser: any;
  let tenantBAdminUser: any;

  let adminToken: string;
  let managerToken: string;
  let waiterToken: string;
  let tenantBToken: string;

  let testCategory: any;
  let testMenuItem: any;
  let testTable: any;
  let testQr: any;

  const createdItemIds: string[] = [];
  const createdRecipeIds: string[] = [];
  const createdOrderIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Users setup
    adminUser = await prisma.user.findFirst({
      where: { tenantId: TEST_TENANT_A, role: "ADMIN", isActive: true },
    });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          tenantId: TEST_TENANT_A,
          email: `admin-p5-${Date.now()}@demo.com`,
          name: "Phase 5 Admin",
          role: "ADMIN",
          passwordHash: "dummy",
        },
      });
    }

    managerUser = await prisma.user.findFirst({
      where: { tenantId: TEST_TENANT_A, role: "MANAGER", isActive: true },
    });
    if (!managerUser) {
      managerUser = await prisma.user.create({
        data: {
          tenantId: TEST_TENANT_A,
          email: `manager-p5-${Date.now()}@demo.com`,
          name: "Phase 5 Manager",
          role: "MANAGER",
          passwordHash: "dummy",
        },
      });
    }

    waiterUser = await prisma.user.findFirst({
      where: { tenantId: TEST_TENANT_A, role: "WAITER", isActive: true },
    });
    if (!waiterUser) {
      waiterUser = await prisma.user.create({
        data: {
          tenantId: TEST_TENANT_A,
          email: `waiter-p5-${Date.now()}@demo.com`,
          name: "Phase 5 Waiter",
          role: "WAITER",
          passwordHash: "dummy",
        },
      });
    }

    tenantBAdminUser = await prisma.user.findFirst({
      where: { tenantId: TEST_TENANT_B, role: "ADMIN", isActive: true },
    });
    if (!tenantBAdminUser) {
      tenantBAdminUser = await prisma.user.create({
        data: {
          tenantId: TEST_TENANT_B,
          email: `admin-b-p5-${Date.now()}@foreign.com`,
          name: "Tenant B Admin",
          role: "ADMIN",
          passwordHash: "dummy",
        },
      });
    }

    // Sign JWT tokens
    adminToken = app.jwt.sign({
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      tenantId: TEST_TENANT_A,
    });

    managerToken = app.jwt.sign({
      sub: managerUser.id,
      email: managerUser.email,
      role: managerUser.role,
      tenantId: TEST_TENANT_A,
    });

    waiterToken = app.jwt.sign({
      sub: waiterUser.id,
      email: waiterUser.email,
      role: waiterUser.role,
      tenantId: TEST_TENANT_A,
    });

    tenantBToken = app.jwt.sign({
      sub: tenantBAdminUser.id,
      email: tenantBAdminUser.email,
      role: tenantBAdminUser.role,
      tenantId: TEST_TENANT_B,
    });

    // 2. Setup Menu Category and Menu Item
    testCategory = await prisma.menuCategory.create({
      data: {
        tenantId: TEST_TENANT_A,
        name: `Inv Test Category ${Date.now()}`,
        displayOrder: 1,
      },
    });

    testMenuItem = await prisma.menuItem.create({
      data: {
        categoryId: testCategory.id,
        name: `Paneer Tikka ${Date.now()}`,
        price: 350.0,
        isAvailable: true,
      },
    });

    // 3. Setup Table and QR Context
    testTable = await prisma.table.create({
      data: {
        tenantId: TEST_TENANT_A,
        tableNumber: `IT-${Date.now().toString().slice(-4)}`,
        displayName: "Inventory Test Table",
        capacity: 4,
      },
    });

    testQr = await prisma.qrCode.create({
      data: {
        tenantId: TEST_TENANT_A,
        token: `inv-qr-${Date.now()}`,
        type: "TABLE",
        tableId: testTable.id,
        isActive: true,
      },
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    if (createdOrderIds.length > 0) {
      await prisma.inventoryTransaction.deleteMany({
        where: { referenceOrderId: { in: createdOrderIds } },
      });
      await prisma.kotItem.deleteMany({
        where: { kot: { orderId: { in: createdOrderIds } } },
      });
      await prisma.kot.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });
      await prisma.orderItem.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      });
      await prisma.order.deleteMany({
        where: { id: { in: createdOrderIds } },
      });
    }

    if (createdRecipeIds.length > 0) {
      await prisma.recipeIngredient.deleteMany({
        where: { recipeId: { in: createdRecipeIds } },
      });
      await prisma.recipe.deleteMany({
        where: { id: { in: createdRecipeIds } },
      });
    }

    if (createdItemIds.length > 0) {
      await prisma.inventoryTransaction.deleteMany({
        where: { inventoryItemId: { in: createdItemIds } },
      });
      await prisma.inventoryItem.deleteMany({
        where: { id: { in: createdItemIds } },
      });
    }

    if (testCategory) {
      await prisma.menuItem.deleteMany({ where: { categoryId: testCategory.id } });
      await prisma.menuCategory.deleteMany({ where: { id: testCategory.id } });
    }
    if (testQr) {
      await prisma.qrCode.deleteMany({ where: { id: testQr.id } });
    }
    if (testTable) {
      await prisma.table.deleteMany({ where: { id: testTable.id } });
    }

    await app.close();
    await disconnectPrisma();
  });

  // =========================================================================
  // 1. INVENTORY ITEM CRUD & MULTI-TENANT ISOLATION
  // =========================================================================
  describe("Phase 5A: Inventory Item CRUD & Multi-Tenant Isolation", () => {
    it("should create a new inventory item and record initial stock", async () => {
      const sku = `PANEER-${Date.now().toString().slice(-4)}`;
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/inventory/items",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: "Fresh Malai Paneer",
          sku,
          category: "Dairy",
          unit: "KG",
          currentStock: 10.5,
          minimumThreshold: 2.0,
          idealStock: 15.0,
          unitCost: 320.0,
          supplierName: "Metro Dairy Farms",
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();

      const item = body.data;
      createdItemIds.push(item.id);

      expect(item.name).toBe("Fresh Malai Paneer");
      expect(item.sku).toBe(sku);
      expect(item.unit).toBe("KG");
      expect(item.currentStock).toBe(10.5);
      expect(item.minimumThreshold).toBe(2.0);
      expect(item.isLowStock).toBe(false);

      // Verify opening stock transaction was recorded in DB
      const txs = await prisma.inventoryTransaction.findMany({
        where: { inventoryItemId: item.id },
      });
      expect(txs).toHaveLength(1);
      expect(txs[0].type).toBe(InventoryTransactionType.RESTOCK);
      expect(Number(txs[0].quantityChange)).toBe(10.5);
    });

    it("should reject duplicate SKU within the same tenant with HTTP 409 SKU_COLLISION", async () => {
      const sku = `BUTTER-${Date.now().toString().slice(-4)}`;
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/inventory/items",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: "Amul Table Butter",
          sku,
          category: "Dairy",
          unit: "KG",
          currentStock: 5.0,
          minimumThreshold: 1.0,
        },
      });
      expect(createRes.statusCode).toBe(201);
      createdItemIds.push(createRes.json().data.id);

      // Second attempt with same SKU
      const collisionRes = await app.inject({
        method: "POST",
        url: "/api/v1/inventory/items",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: "Duplicate Butter",
          sku,
          category: "Dairy",
          unit: "KG",
          currentStock: 2.0,
          minimumThreshold: 1.0,
        },
      });

      expect(collisionRes.statusCode).toBe(409);
      expect(collisionRes.json().error.code).toBe("SKU_COLLISION");
    });

    it("should list inventory items and filter by isLowStock and category", async () => {
      // Create a low stock item
      const lowItemRes = await app.inject({
        method: "POST",
        url: "/api/v1/inventory/items",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: "Saffron Spices",
          sku: `SAFF-${Date.now().toString().slice(-4)}`,
          category: "Spices",
          unit: "GRAM",
          currentStock: 5.0,
          minimumThreshold: 10.0, // currentStock <= threshold -> low stock!
        },
      });
      createdItemIds.push(lowItemRes.json().data.id);

      // Query low stock items
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/inventory/items?isLowStock=true",
        headers: { authorization: `Bearer ${managerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const items = res.json().data.items;
      expect(Array.isArray(items)).toBe(true);
      expect(items.every((it: any) => it.isLowStock === true)).toBe(true);
    });

    it("should reject unauthorized roles (WAITER) from creating inventory items with HTTP 403", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/inventory/items",
        headers: { authorization: `Bearer ${waiterToken}` },
        payload: {
          name: "Unauthorized Flour",
          sku: `FLOUR-${Date.now()}`,
          category: "Grains",
          unit: "KG",
          currentStock: 10.0,
          minimumThreshold: 2.0,
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it("should enforce strict multi-tenant boundary and return HTTP 404 for foreign tenant item", async () => {
      // Create item in Tenant A
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/inventory/items",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: "Tenant A Secret Sauce",
          sku: `SAUCE-${Date.now()}`,
          category: "Sauces",
          unit: "LITRE",
          currentStock: 2.0,
          minimumThreshold: 1.0,
        },
      });
      const item = createRes.json().data;
      createdItemIds.push(item.id);

      // Tenant B tries to read Tenant A item
      const getRes = await app.inject({
        method: "GET",
        url: `/api/v1/inventory/items/${item.id}`,
        headers: { authorization: `Bearer ${tenantBToken}` },
      });

      expect(getRes.statusCode).toBe(404);
      expect(getRes.json().error.code).toBe("ITEM_NOT_FOUND");
    });
  });

  // =========================================================================
  // 2. RECIPE & BILL OF MATERIALS (BOM) MANAGEMENT
  // =========================================================================
  describe("Phase 5B: Recipe & Bill of Materials (BOM) Management", () => {
    it("should define a recipe with ingredient mappings for a menu item", async () => {
      // 1. Create two raw ingredients in Tenant A
      const paneerRes = await app.inject({
        method: "POST",
        url: "/api/v1/inventory/items",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: "Paneer Blocks",
          sku: `PAN-${Date.now().toString().slice(-4)}`,
          category: "Dairy",
          unit: "KG",
          currentStock: 20.0,
          minimumThreshold: 5.0,
        },
      });
      const paneer = paneerRes.json().data;
      createdItemIds.push(paneer.id);

      const butterRes = await app.inject({
        method: "POST",
        url: "/api/v1/inventory/items",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: "Cooking Butter",
          sku: `BUT-${Date.now().toString().slice(-4)}`,
          category: "Dairy",
          unit: "KG",
          currentStock: 10.0,
          minimumThreshold: 2.0,
        },
      });
      const butter = butterRes.json().data;
      createdItemIds.push(butter.id);

      // 2. Upsert Recipe: Paneer Tikka requires 0.200 KG Paneer and 0.050 KG Butter
      const recipeRes = await app.inject({
        method: "POST",
        url: "/api/v1/inventory/recipes",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          menuItemId: testMenuItem.id,
          name: "Paneer Tikka Standard Recipe",
          ingredients: [
            {
              inventoryItemId: paneer.id,
              quantityRequired: 0.2, // 200g
              unit: "KG",
            },
            {
              inventoryItemId: butter.id,
              quantityRequired: 50, // 50g defined in GRAM
              unit: "GRAM",
            },
          ],
        },
      });

      expect(recipeRes.statusCode).toBe(200);
      const recipe = recipeRes.json().data;
      createdRecipeIds.push(recipe.id);

      expect(recipe.menuItemId).toBe(testMenuItem.id);
      expect(recipe.ingredients).toHaveLength(2);

      // Verify retrieval by menuItemId
      const getRes = await app.inject({
        method: "GET",
        url: `/api/v1/inventory/recipes/${testMenuItem.id}`,
        headers: { authorization: `Bearer ${managerToken}` },
      });
      expect(getRes.statusCode).toBe(200);
      expect(getRes.json().data.id).toBe(recipe.id);
    });

    it("should reject recipe definition if an ingredient belongs to another tenant", async () => {
      // Create ingredient in Tenant B
      const tenantBItem = await prisma.inventoryItem.create({
        data: {
          tenantId: TEST_TENANT_B,
          name: "Tenant B Masala",
          sku: `TB-MAS-${Date.now()}`,
          category: "Spices",
          unit: "KG",
        },
      });
      createdItemIds.push(tenantBItem.id);

      // Tenant A tries to use Tenant B's ingredient in its recipe
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/inventory/recipes",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          menuItemId: testMenuItem.id,
          name: "Cross Tenant Attack Recipe",
          ingredients: [
            {
              inventoryItemId: tenantBItem.id,
              quantityRequired: 0.1,
              unit: "KG",
            },
          ],
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("INVALID_INGREDIENTS");
    });

    it("should accurately convert units between mass (KG <-> GRAM) and volume (LITRE <-> ML)", () => {
      // 1.5 KG = 1500 GRAM
      const g = convertQuantity(1.5, InventoryUnit.KG, InventoryUnit.GRAM);
      expect(g.toNumber()).toBe(1500);

      // 500 GRAM = 0.5 KG
      const kg = convertQuantity(500, InventoryUnit.GRAM, InventoryUnit.KG);
      expect(kg.toNumber()).toBe(0.5);

      // 2 LITRE = 2000 ML
      const ml = convertQuantity(2, InventoryUnit.LITRE, InventoryUnit.ML);
      expect(ml.toNumber()).toBe(2000);

      // 250 ML = 0.25 LITRE
      const l = convertQuantity(250, InventoryUnit.ML, InventoryUnit.LITRE);
      expect(l.toNumber()).toBe(0.25);

      // Incompatible conversion throws error
      expect(() => {
        convertQuantity(1, InventoryUnit.KG, InventoryUnit.LITRE);
      }).toThrowError(/Cannot convert between incompatible units/);
    });
  });

  // =========================================================================
  // 3. STOCK RECEIPTS, ADJUSTMENTS & INSUFFICIENT STOCK POLICY
  // =========================================================================
  describe("Phase 5C: Stock Receipts, Adjustments & Insufficient Stock Policy", () => {
    it("should record restock and increase current stock", async () => {
      const itemRes = await app.inject({
        method: "POST",
        url: "/api/v1/inventory/items",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: "Cooking Oil Can",
          sku: `OIL-${Date.now().toString().slice(-4)}`,
          category: "Oils",
          unit: "LITRE",
          currentStock: 10.0,
          minimumThreshold: 3.0,
        },
      });
      const item = itemRes.json().data;
      createdItemIds.push(item.id);

      // Restock +5 Litres
      const adjRes = await app.inject({
        method: "POST",
        url: "/api/v1/inventory/adjustments",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          itemId: item.id,
          quantityChange: 5.0,
          type: "RESTOCK",
          reason: "Received wholesale shipment from Supplier ABC",
        },
      });

      expect(adjRes.statusCode).toBe(201);
      const adj = adjRes.json().data;
      expect(adj.remainingStockAfter).toBe(15.0);
      expect(adj.type).toBe("RESTOCK");

      // Verify item updated in DB
      const freshItem = await prisma.inventoryItem.findUnique({ where: { id: item.id } });
      expect(Number(freshItem?.currentStock)).toBe(15.0);
    });

    it("should reject wastage/usage deduction that would cause negative stock with HTTP 400 INSUFFICIENT_STOCK", async () => {
      const itemRes = await app.inject({
        method: "POST",
        url: "/api/v1/inventory/items",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: "Premium Saffron",
          sku: `SAF-EXP-${Date.now().toString().slice(-4)}`,
          category: "Spices",
          unit: "GRAM",
          currentStock: 5.0, // Only 5g in stock
          minimumThreshold: 1.0,
        },
      });
      const item = itemRes.json().data;
      createdItemIds.push(item.id);

      // Attempt to deduct 10g (exceeds 5g)
      const adjRes = await app.inject({
        method: "POST",
        url: "/api/v1/inventory/adjustments",
        headers: { authorization: `Bearer ${managerToken}` },
        payload: {
          itemId: item.id,
          quantityChange: -10.0,
          type: "WASTAGE",
          reason: "Spilled in prep kitchen",
        },
      });

      expect(adjRes.statusCode).toBe(400);
      expect(adjRes.json().error.code).toBe("INSUFFICIENT_STOCK");
    });
  });

  // =========================================================================
  // 4. AUTOMATIC BOM CONSUMPTION ON ORDER CREATION
  // =========================================================================
  describe("Phase 5D: Automatic BOM Consumption & Concurrency", () => {
    it("should automatically deduct raw ingredients in base unit when an order with a BOM recipe is created", async () => {
      // 1. Create a menu item with a recipe
      const dish = await prisma.menuItem.create({
        data: {
          categoryId: testCategory.id,
          name: `Butter Chicken ${Date.now()}`,
          price: 450.0,
          isAvailable: true,
        },
      });

      // 2. Create raw chicken stocked in KG (10 KG initially)
      const chicken = await prisma.inventoryItem.create({
        data: {
          tenantId: TEST_TENANT_A,
          name: "Fresh Boneless Chicken",
          sku: `CHK-${Date.now().toString().slice(-4)}`,
          category: "Meat",
          unit: "KG",
          currentStock: 10.0,
          minimumThreshold: 2.0,
        },
      });
      createdItemIds.push(chicken.id);

      // 3. Recipe: 1 portion of Butter Chicken requires 300 GRAM Chicken
      const recipe = await prisma.recipe.create({
        data: {
          tenantId: TEST_TENANT_A,
          menuItemId: dish.id,
          name: "Butter Chicken Recipe",
          ingredients: {
            create: [
              {
                inventoryItemId: chicken.id,
                quantityRequired: 300, // 300 GRAM
                unit: "GRAM",
              },
            ],
          },
        },
      });
      createdRecipeIds.push(recipe.id);

      // 4. Customer places order for 2x Butter Chicken (should consume 600 GRAM = 0.600 KG)
      const orderRes = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        payload: {
          qrToken: testQr.token,
          paymentPreference: "PAY_LATER",
          items: [
            {
              menuItemId: dish.id,
              quantity: 2,
            },
          ],
        },
      });

      expect(orderRes.statusCode).toBe(201);
      const order = orderRes.json().data;
      createdOrderIds.push(order.id);

      // 5. Verify stock was automatically deducted from 10.0 to 9.4 KG!
      const updatedChicken = await prisma.inventoryItem.findUnique({
        where: { id: chicken.id },
      });
      expect(Number(updatedChicken?.currentStock)).toBe(9.4);

      // 6. Verify USAGE transaction was recorded
      const txs = await prisma.inventoryTransaction.findMany({
        where: {
          inventoryItemId: chicken.id,
          type: InventoryTransactionType.USAGE,
          referenceOrderId: order.id,
        },
      });
      expect(txs).toHaveLength(1);
      expect(Number(txs[0].quantityChange)).toBe(-0.6);
      expect(Number(txs[0].remainingStockAfter)).toBe(9.4);
    });

    it("should prevent duplicate stock deduction on idempotent retry", async () => {
      const chicken = await prisma.inventoryItem.create({
        data: {
          tenantId: TEST_TENANT_A,
          name: "Idempotent Chicken",
          sku: `IDM-${Date.now().toString().slice(-4)}`,
          category: "Meat",
          unit: "KG",
          currentStock: 5.0,
        },
      });
      createdItemIds.push(chicken.id);

      const dish = await prisma.menuItem.create({
        data: {
          categoryId: testCategory.id,
          name: `Tandoori Chicken ${Date.now()}`,
          price: 400.0,
          isAvailable: true,
        },
      });

      const recipe = await prisma.recipe.create({
        data: {
          tenantId: TEST_TENANT_A,
          menuItemId: dish.id,
          name: "Tandoori Chicken Recipe",
          ingredients: {
            create: [
              {
                inventoryItemId: chicken.id,
                quantityRequired: 0.5,
                unit: "KG",
              },
            ],
          },
        },
      });
      createdRecipeIds.push(recipe.id);

      // Order created
      const orderRes = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        payload: {
          qrToken: testQr.token,
          paymentPreference: "PAY_LATER",
          items: [{ menuItemId: dish.id, quantity: 1 }],
        },
      });
      const order = orderRes.json().data;
      createdOrderIds.push(order.id);

      // Stock should be 5.0 - 0.5 = 4.5
      const stock1 = await prisma.inventoryItem.findUnique({ where: { id: chicken.id } });
      expect(Number(stock1?.currentStock)).toBe(4.5);

      // Manually simulate a worker or retried trigger on the same orderId
      await prisma.$transaction(async (tx) => {
        const replayRes = await inventoryService.deductStockForOrder(
          tx,
          TEST_TENANT_A,
          order.id
        );
        expect(replayRes.deductedCount).toBe(0); // Safely skipped!
      });

      // Stock remains exactly 4.5
      const stock2 = await prisma.inventoryItem.findUnique({ where: { id: chicken.id } });
      expect(Number(stock2?.currentStock)).toBe(4.5);
    });

    it("should automatically set menu item isAvailable to false when inventory stock reaches 0", async () => {
      // 1. Create ingredient with only 0.200 KG stock
      const paneer = await prisma.inventoryItem.create({
        data: {
          tenantId: TEST_TENANT_A,
          name: "Limited Edition Truffle",
          sku: `TRUF-${Date.now().toString().slice(-4)}`,
          category: "Special",
          unit: "KG",
          currentStock: 0.2, // exactly 1 portion
        },
      });
      createdItemIds.push(paneer.id);

      const luxuryDish = await prisma.menuItem.create({
        data: {
          categoryId: testCategory.id,
          name: `Truffle Risotto ${Date.now()}`,
          price: 1200.0,
          isAvailable: true,
        },
      });

      const recipe = await prisma.recipe.create({
        data: {
          tenantId: TEST_TENANT_A,
          menuItemId: luxuryDish.id,
          name: "Truffle Recipe",
          ingredients: {
            create: [
              {
                inventoryItemId: paneer.id,
                quantityRequired: 0.2,
                unit: "KG",
              },
            ],
          },
        },
      });
      createdRecipeIds.push(recipe.id);

      // Order the last portion
      const orderRes = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        payload: {
          qrToken: testQr.token,
          paymentPreference: "PAY_LATER",
          items: [{ menuItemId: luxuryDish.id, quantity: 1 }],
        },
      });
      expect(orderRes.statusCode).toBe(201);
      createdOrderIds.push(orderRes.json().data.id);

      // Stock should now be 0.0
      const freshItem = await prisma.inventoryItem.findUnique({ where: { id: paneer.id } });
      expect(Number(freshItem?.currentStock)).toBe(0.0);

      // Menu item should be automatically 86'd (isAvailable = false)!
      const freshDish = await prisma.menuItem.findUnique({ where: { id: luxuryDish.id } });
      expect(freshDish?.isAvailable).toBe(false);
    });

    it("should safely handle concurrent stock adjustments using PostgreSQL row locking", async () => {
      const item = await prisma.inventoryItem.create({
        data: {
          tenantId: TEST_TENANT_A,
          name: "Concurrent Sugar Bag",
          sku: `SUG-${Date.now().toString().slice(-4)}`,
          category: "Pantry",
          unit: "KG",
          currentStock: 50.0,
          minimumThreshold: 5.0,
        },
      });
      createdItemIds.push(item.id);

      // Run 3 concurrent stock adjustments: -5, -10, +20 (expected net = 50 - 5 - 10 + 20 = 55)
      const [res1, res2, res3] = await Promise.all([
        app.inject({
          method: "POST",
          url: "/api/v1/inventory/adjustments",
          headers: { authorization: `Bearer ${adminToken}` },
          payload: { itemId: item.id, quantityChange: -5.0, type: "USAGE", reason: "Kitchen prep A" },
        }),
        app.inject({
          method: "POST",
          url: "/api/v1/inventory/adjustments",
          headers: { authorization: `Bearer ${adminToken}` },
          payload: { itemId: item.id, quantityChange: -10.0, type: "USAGE", reason: "Kitchen prep B" },
        }),
        app.inject({
          method: "POST",
          url: "/api/v1/inventory/adjustments",
          headers: { authorization: `Bearer ${adminToken}` },
          payload: { itemId: item.id, quantityChange: 20.0, type: "RESTOCK", reason: "New delivery" },
        }),
      ]);

      expect(res1.statusCode).toBe(201);
      expect(res2.statusCode).toBe(201);
      expect(res3.statusCode).toBe(201);

      // Verify exact final stock in PostgreSQL
      const finalItem = await prisma.inventoryItem.findUnique({ where: { id: item.id } });
      expect(Number(finalItem?.currentStock)).toBe(55.0);
    });
  });
});
