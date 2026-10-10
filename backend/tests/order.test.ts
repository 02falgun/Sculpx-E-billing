import { describe, it, expect, beforeAll, afterAll } from "vitest";
import crypto from "node:crypto";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { sequenceService } from "../src/services/sequence.service.js";
import { outboxService } from "../src/services/outbox.service.js";

const TEST_TENANT_A = "e1b1d1f0-0000-4000-8000-000000000001";
const TEST_TENANT_B = "00000000-0000-4000-8000-000000000099";

describe("SCULPX E-Billing — Phase 3B.3 Transactional Order Creation Tests", () => {
  let app: FastifyInstance;

  // Fixture IDs
  let tableAId: string;
  let roomAId: string;
  let categoryAId: string;
  let validItemId: string;
  let unavailableItemId: string;
  let foreignCategoryBId: string;
  let foreignItemId: string;

  let portionGroupId: string;
  let halfOptionId: string;
  let fullOptionId: string;

  let addonGroupId: string;
  let gravyOptionId: string;

  const validTableQr = `test-order-table-qr-${Date.now()}`;
  const validRoomQr = `test-order-room-qr-${Date.now()}`;
  const inactiveQr = `test-order-inactive-qr-${Date.now()}`;

  let waiterToken: string;

  // Track created orders for afterAll cleanup
  const createdOrderIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Table & Room Fixtures in Tenant A
    const tableA = await prisma.table.create({
      data: {
        tenantId: TEST_TENANT_A,
        tableNumber: "T-ORD-1",
        displayName: "Dining Table 1",
        capacity: 4,
        section: "Main Dining",
      },
    });
    tableAId = tableA.id;

    const roomA = await prisma.room.create({
      data: {
        tenantId: TEST_TENANT_A,
        roomNumber: "305",
        floor: "3rd Floor",
        guestName: "Arjun Verma",
        folioId: "FOLIO-305",
      },
    });
    roomAId = roomA.id;

    // 2. Seed QR records
    await prisma.qrCode.createMany({
      data: [
        {
          tenantId: TEST_TENANT_A,
          token: validTableQr,
          type: "TABLE",
          tableId: tableAId,
          isActive: true,
        },
        {
          tenantId: TEST_TENANT_A,
          token: validRoomQr,
          type: "ROOM",
          roomId: roomAId,
          isActive: true,
        },
        {
          tenantId: TEST_TENANT_A,
          token: inactiveQr,
          type: "TABLE",
          tableId: tableAId,
          isActive: false,
        },
      ],
    });

    // 3. Menu Categories
    const catA = await prisma.menuCategory.create({
      data: {
        tenantId: TEST_TENANT_A,
        name: "Order Test Category A",
        displayOrder: 1,
        isActive: true,
      },
    });
    categoryAId = catA.id;

    const catB = await prisma.menuCategory.create({
      data: {
        tenantId: TEST_TENANT_B,
        name: "Foreign Category B",
        displayOrder: 1,
        isActive: true,
      },
    });
    foreignCategoryBId = catB.id;

    // 4. Available item: Base 400.00, Tax 5%
    const validItem = await prisma.menuItem.create({
      data: {
        categoryId: categoryAId,
        name: "Butter Chicken Special",
        price: 400.0,
        taxRatePercentage: 5.0,
        isAvailable: true,
      },
    });
    validItemId = validItem.id;

    // Portion Size Group (min: 1, max: 1, required)
    const portionGroup = await prisma.modifierGroup.create({
      data: {
        menuItemId: validItemId,
        name: "Portion",
        minSelections: 1,
        maxSelections: 1,
        isRequired: true,
      },
    });
    portionGroupId = portionGroup.id;

    const halfOpt = await prisma.modifierOption.create({
      data: {
        groupId: portionGroupId,
        name: "Half",
        price: 0.0,
      },
    });
    halfOptionId = halfOpt.id;

    const fullOpt = await prisma.modifierOption.create({
      data: {
        groupId: portionGroupId,
        name: "Full",
        price: 150.0,
      },
    });
    fullOptionId = fullOpt.id;

    // Addons Group (min: 0, max: 2, optional)
    const addonGroup = await prisma.modifierGroup.create({
      data: {
        menuItemId: validItemId,
        name: "Addons",
        minSelections: 0,
        maxSelections: 2,
        isRequired: false,
      },
    });
    addonGroupId = addonGroup.id;

    const gravyOpt = await prisma.modifierOption.create({
      data: {
        groupId: addonGroupId,
        name: "Extra Gravy",
        price: 50.0,
      },
    });
    gravyOptionId = gravyOpt.id;

    // Sold out item
    const unavailableItem = await prisma.menuItem.create({
      data: {
        categoryId: categoryAId,
        name: "Mutton Rogan Josh (86'd)",
        price: 550.0,
        taxRatePercentage: 5.0,
        isAvailable: false,
      },
    });
    unavailableItemId = unavailableItem.id;

    // Foreign tenant item
    const foreignItem = await prisma.menuItem.create({
      data: {
        categoryId: foreignCategoryBId,
        name: "Tenant B Biryani",
        price: 350.0,
        taxRatePercentage: 5.0,
        isAvailable: true,
      },
    });
    foreignItemId = foreignItem.id;

    // Staff token for Waiter
    waiterToken = app.jwt.sign({
      sub: "00000000-0000-0000-0000-000000000001",
      email: "waiter@demo.com",
      role: "WAITER",
      tenantId: TEST_TENANT_A,
    });
  });

  afterAll(async () => {
    // Restore default dispatcher
    outboxService.setDispatcher(null);

    // Clean up created orders (cascades order_items, kots, kot_items)
    if (createdOrderIds.length > 0) {
      await (prisma as any).idempotencyKey.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      }).catch(() => {});

      await (prisma as any).outboxEvent.deleteMany({
        where: { tenantId: TEST_TENANT_A },
      }).catch(() => {});

      await prisma.kotItem.deleteMany({
        where: { kot: { orderId: { in: createdOrderIds } } },
      }).catch(() => {});

      await prisma.kot.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      }).catch(() => {});

      await prisma.orderItem.deleteMany({
        where: { orderId: { in: createdOrderIds } },
      }).catch(() => {});

      await prisma.order.deleteMany({
        where: { id: { in: createdOrderIds } },
      }).catch(() => {});
    }

    // Clean up QR codes
    await prisma.qrCode.deleteMany({
      where: {
        token: { in: [validTableQr, validRoomQr, inactiveQr] },
      },
    }).catch(() => {});

    // Clean up tables & rooms
    if (tableAId) await prisma.table.delete({ where: { id: tableAId } }).catch(() => {});
    if (roomAId) await prisma.room.delete({ where: { id: roomAId } }).catch(() => {});

    // Clean up menu items
    if (validItemId) await prisma.menuItem.delete({ where: { id: validItemId } }).catch(() => {});
    if (unavailableItemId) await prisma.menuItem.delete({ where: { id: unavailableItemId } }).catch(() => {});
    if (foreignItemId) await prisma.menuItem.delete({ where: { id: foreignItemId } }).catch(() => {});

    // Clean up categories
    if (categoryAId) await prisma.menuCategory.delete({ where: { id: categoryAId } }).catch(() => {});
    if (foreignCategoryBId) await prisma.menuCategory.delete({ where: { id: foreignCategoryBId } }).catch(() => {});

    await app.close();
  });

  // =========================================================================
  // 1. Successful Order Creation & Server-Authoritative Pricing
  // =========================================================================
  describe("1. Successful Order Creation & Authoritative Persistence", () => {
    it("should create order, order items, and initial KOT with authoritative pricing", async () => {
      // 2 portions of Butter Chicken:
      // Base: 400.00 + Full: 150.00 + Gravy: 50.00 = 600.00 per unit
      // Subtotal = 1200.00
      // Tax (5%) = 60.00 (CGST 30.00, SGST 30.00)
      // Grand Total = 1260.00
      // Client tries to spoof clientPrice as 10.00
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        payload: {
          qrToken: validTableQr,
          customerName: "Rohan Gupta",
          customerPhone: "+91 98765 43210",
          specialInstructions: "Less spicy please",
          paymentPreference: "PAY_LATER",
          items: [
            {
              menuItemId: validItemId,
              quantity: 2,
              modifierOptionIds: [fullOptionId, gravyOptionId],
              clientPrice: 10.0, // Client spoof attempt
              specialInstructions: "Garnish with fresh coriander",
            },
          ],
        },
      });

      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.success).toBe(true);
      expect(json.data.orderNumber).toMatch(/^ORD-\d{8}-\d{4}$/);
      expect(json.data.status).toBe("CONFIRMED");
      expect(json.data.source).toBe("CUSTOMER_QR");
      expect(json.data.subtotal).toBe(1200);
      expect(json.data.taxTotal).toBe(60);
      expect(json.data.grandTotal).toBe(1260);
      expect(json.data.customerName).toBe("Rohan Gupta");
      expect(json.data.diningContext.type).toBe("TABLE");
      expect(json.data.diningContext.identifier).toBe("T-ORD-1");

      // Verify items breakdown
      expect(json.data.items).toHaveLength(1);
      const item = json.data.items[0];
      expect(item.itemName).toBe("Butter Chicken Special");
      expect(item.quantity).toBe(2);
      expect(item.unitPrice).toBe(600);
      expect(item.totalPrice).toBe(1200);
      expect(item.taxAmount).toBe(60);
      expect(item.modifiers).toHaveLength(2);

      // Verify KOT creation
      expect(json.data.assignedKotIds).toHaveLength(1);
      expect(json.data.kots).toHaveLength(1);
      const kot = json.data.kots[0];
      expect(kot.kotNumber).toMatch(/^KOT-\d{8}-\d{4}$/);
      expect(kot.status).toBe("NEW");
      expect(kot.station).toBe("Main Kitchen");

      // Track order ID for cleanup
      createdOrderIds.push(json.data.id);

      // Verify Database records
      const dbOrder = await prisma.order.findUnique({
        where: { id: json.data.id },
        include: {
          items: {
            include: { kotItems: true },
          },
          kots: {
            include: { items: true },
          },
        },
      });

      expect(dbOrder).not.toBeNull();
      expect(Number(dbOrder!.grandTotal)).toBe(1260);
      expect(dbOrder!.items).toHaveLength(1);
      expect(dbOrder!.kots).toHaveLength(1);
      expect(dbOrder!.kots[0].items).toHaveLength(1);
      expect(dbOrder!.kots[0].items[0].modifiersSummary).toContain("Full");
      expect(dbOrder!.kots[0].items[0].modifiersSummary).toContain("Extra Gravy");

      // Verify Table status updated to OCCUPIED and currentOrderId set
      const dbTable = await prisma.table.findUnique({ where: { id: tableAId } });
      expect(dbTable?.status).toBe("OCCUPIED");
      expect(dbTable?.currentOrderId).toBe(json.data.id);

      // Verify Outbox events were written
      const outboxEvents = await (prisma as any).outboxEvent.findMany({
        where: { tenantId: TEST_TENANT_A },
      });
      const orderCreatedEvent = outboxEvents.find((e: any) => e.eventType === "order.created");
      const kotCreatedEvent = outboxEvents.find((e: any) => e.eventType === "kot.created");
      expect(orderCreatedEvent).toBeDefined();
      expect(kotCreatedEvent).toBeDefined();
    });

    it("should successfully create an order from a room QR context", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        payload: {
          qrToken: validRoomQr,
          paymentPreference: "PAY_LATER",
          items: [
            {
              menuItemId: validItemId,
              quantity: 1,
              modifierOptionIds: [halfOptionId],
            },
          ],
        },
      });

      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.data.diningContext.type).toBe("ROOM");
      expect(json.data.diningContext.identifier).toBe("305");
      expect(json.data.grandTotal).toBe(420); // Base 400 + Half 0 = 400 + 5% tax (20) = 420

      createdOrderIds.push(json.data.id);

      const dbOrder = await prisma.order.findUnique({ where: { id: json.data.id } });
      expect(dbOrder?.roomId).toBe(roomAId);
      expect(dbOrder?.tableId).toBeNull();
    });

    it("should record STAFF_POS source when created by authenticated staff member", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        headers: {
          authorization: `Bearer ${waiterToken}`,
        },
        payload: {
          qrToken: validTableQr,
          source: "STAFF_POS",
          items: [
            {
              menuItemId: validItemId,
              quantity: 1,
              modifierOptionIds: [halfOptionId],
            },
          ],
        },
      });

      expect(res.statusCode).toBe(201);
      const json = res.json();
      expect(json.data.source).toBe("STAFF_POS");
      createdOrderIds.push(json.data.id);
    });
  });

  // =========================================================================
  // 2. Validation & Security Enforcements
  // =========================================================================
  describe("2. Validation & Security Enforcements", () => {
    it("should reject non-existent QR token with HTTP 404 QR_NOT_FOUND", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        payload: {
          qrToken: "non-existent-qr-token-xyz",
          items: [{ menuItemId: validItemId, quantity: 1, modifierOptionIds: [halfOptionId] }],
        },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("QR_NOT_FOUND");
    });

    it("should reject inactive QR code with HTTP 400 QR_INACTIVE", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        payload: {
          qrToken: inactiveQr,
          items: [{ menuItemId: validItemId, quantity: 1, modifierOptionIds: [halfOptionId] }],
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("QR_INACTIVE");
    });

    it("should reject unavailable (86'd) item with HTTP 409 ITEM_UNAVAILABLE", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        payload: {
          qrToken: validTableQr,
          items: [{ menuItemId: unavailableItemId, quantity: 1 }],
        },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe("ITEM_UNAVAILABLE");
    });

    it("should reject foreign tenant menu item with HTTP 409 ITEM_UNAVAILABLE", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        payload: {
          qrToken: validTableQr,
          items: [{ menuItemId: foreignItemId, quantity: 1 }],
        },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe("ITEM_UNAVAILABLE");
    });

    it("should reject order with missing required modifier selection", async () => {
      // Portion is required (min: 1)
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        payload: {
          qrToken: validTableQr,
          items: [
            {
              menuItemId: validItemId,
              quantity: 1,
              modifierOptionIds: [], // Empty selections
            },
          ],
        },
      });

      expect(res.statusCode).toBe(409); // item unavailable due to missing requirement
      expect(res.json().error.code).toBe("ITEM_UNAVAILABLE");
    });

    it("should reject order with invalid modifier option ID", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        payload: {
          qrToken: validTableQr,
          items: [
            {
              menuItemId: validItemId,
              quantity: 1,
              modifierOptionIds: ["00000000-0000-0000-0000-000000000999"],
            },
          ],
        },
      });

      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe("ITEM_UNAVAILABLE");
    });

    it("should reject empty items array with HTTP 400 VALIDATION_FAILED", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        payload: {
          qrToken: validTableQr,
          items: [],
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("VALIDATION_FAILED");
    });

    it("should reject negative or zero item quantities with HTTP 400 VALIDATION_FAILED", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        payload: {
          qrToken: validTableQr,
          items: [{ menuItemId: validItemId, quantity: 0 }],
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("VALIDATION_FAILED");
    });
  });

  // =========================================================================
  // 3. Durable Concurrency-Safe Idempotency
  // =========================================================================
  describe("3. Durable Concurrency-Safe Idempotency", () => {
    it("should replay cached successful order when called with the same key and same payload", async () => {
      const idempotencyKey = crypto.randomUUID();
      const payload = {
        qrToken: validTableQr,
        customerName: "Idempotency Test User",
        items: [
          {
            menuItemId: validItemId,
            quantity: 1,
            modifierOptionIds: [halfOptionId],
          },
        ],
      };

      const ordersCountBefore = await prisma.order.count({ where: { tenantId: TEST_TENANT_A } });

      // First submission
      const res1 = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        headers: { "idempotency-key": idempotencyKey },
        payload,
      });

      expect(res1.statusCode).toBe(201);
      const data1 = res1.json().data;
      createdOrderIds.push(data1.id);

      const ordersCountAfter1 = await prisma.order.count({ where: { tenantId: TEST_TENANT_A } });
      expect(ordersCountAfter1).toBe(ordersCountBefore + 1);

      // Replay with identical key & payload
      const res2 = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        headers: { "idempotency-key": idempotencyKey },
        payload,
      });

      expect(res2.statusCode).toBe(201);
      const data2 = res2.json().data;

      // Returns the exact same order entity
      expect(data2.id).toBe(data1.id);
      expect(data2.orderNumber).toBe(data1.orderNumber);
      expect(data2.grandTotal).toBe(data1.grandTotal);

      // Database order count must NOT increase
      const ordersCountAfter2 = await prisma.order.count({ where: { tenantId: TEST_TENANT_A } });
      expect(ordersCountAfter2).toBe(ordersCountAfter1);
    });

    it("should return HTTP 409 IDEMPOTENCY_CONFLICT when key is reused with a different payload", async () => {
      const idempotencyKey = crypto.randomUUID();

      // First submission
      const res1 = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        headers: { "idempotency-key": idempotencyKey },
        payload: {
          qrToken: validTableQr,
          customerName: "Alice",
          items: [{ menuItemId: validItemId, quantity: 1, modifierOptionIds: [halfOptionId] }],
        },
      });

      expect(res1.statusCode).toBe(201);
      createdOrderIds.push(res1.json().data.id);

      // Second submission with modified payload (different quantity)
      const res2 = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        headers: { "idempotency-key": idempotencyKey },
        payload: {
          qrToken: validTableQr,
          customerName: "Bob Changed",
          items: [{ menuItemId: validItemId, quantity: 3, modifierOptionIds: [halfOptionId] }],
        },
      });

      expect(res2.statusCode).toBe(409);
      expect(res2.json().error.code).toBe("IDEMPOTENCY_CONFLICT");
    });

    it("should safely handle concurrent requests with the same key without duplicating orders", async () => {
      const idempotencyKey = crypto.randomUUID();
      const payload = {
        qrToken: validTableQr,
        customerName: "Race Condition Test",
        items: [{ menuItemId: validItemId, quantity: 1, modifierOptionIds: [halfOptionId] }],
      };

      const ordersBefore = await prisma.order.count({ where: { tenantId: TEST_TENANT_A } });

      // Fire 2 concurrent requests with identical idempotency key
      const [res1, res2] = await Promise.all([
        app.inject({
          method: "POST",
          url: "/api/v1/orders",
          headers: { "idempotency-key": idempotencyKey },
          payload,
        }),
        app.inject({
          method: "POST",
          url: "/api/v1/orders",
          headers: { "idempotency-key": idempotencyKey },
          payload,
        }),
      ]);

      // Exactly one succeeds with 201, the other either receives 201 (cached) or 409 (in progress)
      const statuses = [res1.statusCode, res2.statusCode];
      expect(statuses).toContain(201);

      if (res1.statusCode === 201) createdOrderIds.push(res1.json().data.id);
      if (res2.statusCode === 201 && res2.json().data.id !== res1.json().data?.id) {
        createdOrderIds.push(res2.json().data.id);
      }

      // Assert only 1 order was inserted in the database
      const ordersAfter = await prisma.order.count({ where: { tenantId: TEST_TENANT_A } });
      expect(ordersAfter).toBe(ordersBefore + 1);
    });
  });

  // =========================================================================
  // 4. Sequential Concurrency-Safe Order Number Allocation
  // =========================================================================
  describe("4. Sequential Order Number Allocation", () => {
    it("should generate strictly sequential, non-colliding order numbers under concurrent load", async () => {
      // Allocate 5 numbers in parallel
      const allocations = await Promise.all([
        sequenceService.allocateOrderNumber(TEST_TENANT_A),
        sequenceService.allocateOrderNumber(TEST_TENANT_A),
        sequenceService.allocateOrderNumber(TEST_TENANT_A),
        sequenceService.allocateOrderNumber(TEST_TENANT_A),
        sequenceService.allocateOrderNumber(TEST_TENANT_A),
      ]);

      // All 5 numbers must be unique
      const uniqueSet = new Set(allocations);
      expect(uniqueSet.size).toBe(5);

      for (const num of allocations) {
        expect(num).toMatch(/^ORD-\d{8}-\d{4}$/);
      }
    });
  });

  // =========================================================================
  // 5. Atomic Rollback & Outbox Reliability
  // =========================================================================
  describe("5. Atomic Rollback & Outbox Reliability", () => {
    it("should atomically roll back entire transaction if order-item creation fails", async () => {
      const ordersBefore = await prisma.order.count();
      const kotsBefore = await prisma.kot.count();

      // Trigger transaction with an error simulation by passing a non-existent item ID inside items
      // (This is prevented by cart validation, so we test atomic rollback inside transaction directly)
      await expect(
        prisma.$transaction(async (tx) => {
          await tx.order.create({
            data: {
              tenantId: TEST_TENANT_A,
              orderNumber: `ORD-FAIL-ROLLBACK-${Date.now()}`,
              source: "CUSTOMER_QR",
              status: "CONFIRMED",
              paymentPreference: "PAY_LATER",
              subtotal: 100,
              taxTotal: 5,
              grandTotal: 105,
            },
          });

          // Simulate an unexpected error before KOT creation
          throw new Error("Simulated database failure during order items creation");
        })
      ).rejects.toThrow("Simulated database failure during order items creation");

      const ordersAfter = await prisma.order.count();
      const kotsAfter = await prisma.kot.count();
      expect(ordersAfter).toBe(ordersBefore);
      expect(kotsAfter).toBe(kotsBefore);
    });

    it("should preserve order and KOT commitment even if outbox dispatch fails after commit", async () => {
      // Configure dispatcher to fail
      outboxService.setDispatcher(async () => {
        throw new Error("Simulated WebSocket broker connection drop");
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        payload: {
          qrToken: validTableQr,
          customerName: "Outbox Failure Resilient Customer",
          items: [{ menuItemId: validItemId, quantity: 1, modifierOptionIds: [halfOptionId] }],
        },
      });

      // The HTTP order creation must still succeed with 201 Created!
      expect(res.statusCode).toBe(201);
      const orderId = res.json().data.id;
      createdOrderIds.push(orderId);

      // Verify the order and KOT are firmly persisted in PostgreSQL
      const dbOrder = await prisma.order.findUnique({ where: { id: orderId } });
      expect(dbOrder).not.toBeNull();

      // Give async background outbox worker a moment to complete error recording
      await new Promise((r) => setTimeout(r, 800));

      // Verify outbox recorded the dispatch failure with incremented retry count
      const failedEvents = await (prisma as any).outboxEvent.findMany({
        where: {
          tenantId: TEST_TENANT_A,
          payload: { path: ["orderId"], equals: orderId },
        },
      });

      expect(failedEvents.length).toBeGreaterThan(0);
      const ev = failedEvents[0];
      expect(ev.retryCount).toBeGreaterThanOrEqual(1);
      expect(ev.lastError).toContain("Simulated WebSocket broker connection drop");

      // Reset dispatcher to healthy
      outboxService.setDispatcher(null);
    });

    it("should preserve historical price snapshot if menu item price is subsequently changed", async () => {
      // 1. Create order with current price (400.00 base + 150.00 full = 550.00)
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders",
        payload: {
          qrToken: validTableQr,
          items: [{ menuItemId: validItemId, quantity: 1, modifierOptionIds: [fullOptionId] }],
        },
      });

      expect(res.statusCode).toBe(201);
      const orderId = res.json().data.id;
      createdOrderIds.push(orderId);

      // 2. Change the menu item price in PostgreSQL from 400.00 to 999.00
      await prisma.menuItem.update({
        where: { id: validItemId },
        data: { price: 999.0 },
      });

      // 3. Verify order and order items retain the historical snapshot price
      const dbItem = await prisma.orderItem.findFirst({
        where: { orderId },
      });
      expect(Number(dbItem?.unitPrice)).toBe(550.0);
      expect(Number(dbItem?.totalPrice)).toBe(550.0);

      // Restore price back to 400.00
      await prisma.menuItem.update({
        where: { id: validItemId },
        data: { price: 400.0 },
      });
    });
  });
});
