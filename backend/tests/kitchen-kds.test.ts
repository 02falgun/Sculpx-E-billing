import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma, disconnectPrisma } from "../src/lib/prisma.js";
import { KotStatus, OrderStatus, OutboxStatus } from "@prisma/client";
import { kitchenService } from "../src/services/kitchen.service.js";
import { outboxService } from "../src/services/outbox.service.js";

const TEST_TENANT_A = "e1b1d1f0-0000-4000-8000-000000000001";
const TEST_TENANT_B = "00000000-0000-4000-8000-000000000099";

describe("SCULPX E-Billing — Phase 3C: KOT Status Progression & KDS Workflow", { timeout: 30000 }, () => {
  let app: FastifyInstance;

  let kitchenUser: any;
  let managerUser: any;
  let waiterUser: any;
  let cashierUser: any;
  let tenantBUser: any;

  let kitchenToken: string;
  let managerToken: string;
  let waiterToken: string;
  let cashierToken: string;
  let tenantBToken: string;

  let testTableId: string;
  let testMenuItemId: string;

  const createdOrderIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Locate or create test users
    kitchenUser = await prisma.user.findFirst({
      where: { tenantId: TEST_TENANT_A, role: "KITCHEN_STAFF", isActive: true },
    });
    if (!kitchenUser) {
      kitchenUser = await prisma.user.create({
        data: {
          tenantId: TEST_TENANT_A,
          email: `kitchen-test-${Date.now()}@demo.com`,
          name: "Test Chef",
          role: "KITCHEN_STAFF",
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
          email: `manager-test-${Date.now()}@demo.com`,
          name: "Test Manager",
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
          email: `waiter-test-${Date.now()}@demo.com`,
          name: "Test Waiter",
          role: "WAITER",
          passwordHash: "dummy",
        },
      });
    }

    cashierUser = await prisma.user.findFirst({
      where: { tenantId: TEST_TENANT_A, role: "CASHIER", isActive: true },
    });
    if (!cashierUser) {
      cashierUser = await prisma.user.create({
        data: {
          tenantId: TEST_TENANT_A,
          email: `cashier-test-${Date.now()}@demo.com`,
          name: "Test Cashier",
          role: "CASHIER",
          passwordHash: "dummy",
        },
      });
    }

    tenantBUser = await prisma.user.findFirst({
      where: { tenantId: TEST_TENANT_B, isActive: true },
    });
    if (!tenantBUser) {
      tenantBUser = await prisma.user.create({
        data: {
          tenantId: TEST_TENANT_B,
          email: `chef-b-${Date.now()}@foreign.com`,
          name: "Tenant B Chef",
          role: "KITCHEN_STAFF",
          passwordHash: "dummy",
        },
      });
    }

    // Sign tokens
    kitchenToken = app.jwt.sign({
      sub: kitchenUser.id,
      email: kitchenUser.email,
      role: kitchenUser.role,
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

    cashierToken = app.jwt.sign({
      sub: cashierUser.id,
      email: cashierUser.email,
      role: cashierUser.role,
      tenantId: TEST_TENANT_A,
    });

    tenantBToken = app.jwt.sign({
      sub: tenantBUser.id,
      email: tenantBUser.email,
      role: tenantBUser.role,
      tenantId: TEST_TENANT_B,
    });

    // 2. Create Table & Menu Fixtures in Tenant A
    const table = await prisma.table.create({
      data: {
        tenantId: TEST_TENANT_A,
        tableNumber: `KDS-${Date.now().toString().slice(-4)}`,
        displayName: "KDS Test Table",
        capacity: 4,
      },
    });
    testTableId = table.id;

    const category = await prisma.menuCategory.create({
      data: {
        tenantId: TEST_TENANT_A,
        name: `KDS Cat ${Date.now()}`,
      },
    });

    const item = await prisma.menuItem.create({
      data: {
        categoryId: category.id,
        name: "KDS Crispy Corn",
        price: 280.0,
        taxRatePercentage: 5.0,
        isAvailable: true,
      },
    });
    testMenuItemId = item.id;
  });

  afterAll(async () => {
    outboxService.setDispatcher(null);

    // Clean up created orders
    if (createdOrderIds.length > 0) {
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

    if (app) {
      await app.close();
    }
    await disconnectPrisma();
  });

  // Helper to create an order with an associated KOT
  async function createTestOrderWithKot(tenantId = TEST_TENANT_A, initialStatus: KotStatus = KotStatus.NEW) {
    const timestamp = Date.now();
    const orderNumber = `ORD-KDS-${timestamp}`;
    const kotNumber = `KOT-KDS-${timestamp}`;

    const order = await prisma.order.create({
      data: {
        tenantId,
        orderNumber,
        source: "CUSTOMER_QR",
        tableId: testTableId,
        status: OrderStatus.CONFIRMED,
        paymentPreference: "PAY_LATER",
        subtotal: 280.0,
        taxTotal: 14.0,
        grandTotal: 294.0,
        specialInstructions: "Extra crunchy please",
      },
    });
    createdOrderIds.push(order.id);

    const orderItem = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        menuItemId: testMenuItemId,
        itemName: "KDS Crispy Corn",
        quantity: 2,
        unitPrice: 280.0,
        totalPrice: 560.0,
        taxAmount: 28.0,
        selectedModifiers: [{ name: "Spicy Masala", price: 20 }],
        specialInstructions: "Well done",
        status: "PLACED",
      },
    });

    const kot = await prisma.kot.create({
      data: {
        orderId: order.id,
        kotNumber,
        status: initialStatus,
        station: "Main Kitchen",
      },
    });

    const kotItem = await prisma.kotItem.create({
      data: {
        kotId: kot.id,
        orderItemId: orderItem.id,
        quantity: 2,
        modifiersSummary: "Spicy Masala",
        specialInstructions: "Well done",
      },
    });

    return { order, orderItem, kot, kotItem };
  }

  describe("1. Valid KOT Status Progression Lifecycle", () => {
    it("should step through NEW -> ACCEPTED -> PREPARING -> READY -> SERVED with correct timestamps and order sync", async () => {
      const { order, orderItem, kot } = await createTestOrderWithKot();

      // Step 1: NEW -> ACCEPTED
      const resAccepted = await app.inject({
        method: "PATCH",
        url: `/api/v1/kitchen/kots/${kot.id}/status`,
        headers: { authorization: `Bearer ${kitchenToken}` },
        payload: { status: "ACCEPTED", note: "Chef accepted" },
      });

      expect(resAccepted.statusCode).toBe(200);
      const bodyAccepted = JSON.parse(resAccepted.body);
      expect(bodyAccepted.success).toBe(true);
      expect(bodyAccepted.data.status).toBe(KotStatus.ACCEPTED);
      expect(bodyAccepted.data.acceptedAt).toBeDefined();

      // Step 2: ACCEPTED -> PREPARING
      const resPreparing = await app.inject({
        method: "PATCH",
        url: `/api/v1/kitchen/kots/${kot.id}/status`,
        headers: { authorization: `Bearer ${kitchenToken}` },
        payload: { status: "PREPARING" },
      });

      expect(resPreparing.statusCode).toBe(200);
      const bodyPreparing = JSON.parse(resPreparing.body);
      expect(bodyPreparing.data.status).toBe(KotStatus.PREPARING);

      // Verify linked OrderItem updated to PREPARING
      const updatedOrderItemPrep = await prisma.orderItem.findUnique({
        where: { id: orderItem.id },
      });
      expect(updatedOrderItemPrep?.status).toBe("PREPARING");

      // Verify parent Order updated to PREPARING
      const updatedOrderPrep = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(updatedOrderPrep?.status).toBe(OrderStatus.PREPARING);

      // Step 3: PREPARING -> READY
      const resReady = await app.inject({
        method: "PATCH",
        url: `/api/v1/kitchen/kots/${kot.id}/status`,
        headers: { authorization: `Bearer ${kitchenToken}` },
        payload: { status: "READY" },
      });

      expect(resReady.statusCode).toBe(200);
      const bodyReady = JSON.parse(resReady.body);
      expect(bodyReady.data.status).toBe(KotStatus.READY);
      expect(bodyReady.data.readyAt).toBeDefined();

      // Verify linked OrderItem updated to READY
      const updatedOrderItemReady = await prisma.orderItem.findUnique({
        where: { id: orderItem.id },
      });
      expect(updatedOrderItemReady?.status).toBe("READY");

      // Verify parent Order updated to READY
      const updatedOrderReady = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(updatedOrderReady?.status).toBe(OrderStatus.READY);

      // Step 4: READY -> SERVED
      const resServed = await app.inject({
        method: "PATCH",
        url: `/api/v1/kitchen/kots/${kot.id}/status`,
        headers: { authorization: `Bearer ${kitchenToken}` },
        payload: { status: "SERVED" },
      });

      expect(resServed.statusCode).toBe(200);
      const bodyServed = JSON.parse(resServed.body);
      expect(bodyServed.data.status).toBe(KotStatus.SERVED);
      expect(bodyServed.data.servedAt).toBeDefined();

      // Verify linked OrderItem updated to SERVED
      const updatedOrderItemServed = await prisma.orderItem.findUnique({
        where: { id: orderItem.id },
      });
      expect(updatedOrderItemServed?.status).toBe("SERVED");

      // Verify parent Order updated to SERVED
      const updatedOrderServed = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(updatedOrderServed?.status).toBe(OrderStatus.SERVED);
    });

    it("should normalize 'PENDING' to 'NEW' when submitted", async () => {
      const { kot } = await createTestOrderWithKot(TEST_TENANT_A, KotStatus.NEW);

      // Repeated safe replay with PENDING
      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/kitchen/kots/${kot.id}/status`,
        headers: { authorization: `Bearer ${kitchenToken}` },
        payload: { status: "PENDING" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.status).toBe(KotStatus.NEW);
    });
  });

  describe("2. Illegal Status Transitions & Validation Rejection", () => {
    it("should reject illegal forward skip (NEW -> READY) with HTTP 409 INVALID_STATUS_TRANSITION", async () => {
      const { kot } = await createTestOrderWithKot(TEST_TENANT_A, KotStatus.NEW);

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/kitchen/kots/${kot.id}/status`,
        headers: { authorization: `Bearer ${kitchenToken}` },
        payload: { status: "READY" },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe("INVALID_STATUS_TRANSITION");
      expect(body.error.message).toContain("cannot transition KOT from 'NEW' to 'READY'");
    });

    it("should reject illegal backward transition (SERVED -> PREPARING) with HTTP 409", async () => {
      const { kot } = await createTestOrderWithKot(TEST_TENANT_A, KotStatus.SERVED);

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/kitchen/kots/${kot.id}/status`,
        headers: { authorization: `Bearer ${kitchenToken}` },
        payload: { status: "PREPARING" },
      });

      expect(res.statusCode).toBe(409);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("INVALID_STATUS_TRANSITION");
    });

    it("should reject invalid/unrecognized status with HTTP 400 VALIDATION_FAILED", async () => {
      const { kot } = await createTestOrderWithKot();

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/kitchen/kots/${kot.id}/status`,
        headers: { authorization: `Bearer ${kitchenToken}` },
        payload: { status: "COOKING_FAST" },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("VALIDATION_FAILED");
    });
  });

  describe("3. Repeated Transition Requests (Idempotent Safe Replay)", () => {
    it("should safely return current state when requested status matches existing status without duplicating outbox records", async () => {
      const { kot } = await createTestOrderWithKot(TEST_TENANT_A, KotStatus.ACCEPTED);

      const outboxCountBefore = await prisma.outboxEvent.count({
        where: { tenantId: TEST_TENANT_A, eventType: "kot.status_updated" },
      });

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/kitchen/kots/${kot.id}/status`,
        headers: { authorization: `Bearer ${kitchenToken}` },
        payload: { status: "ACCEPTED" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe(KotStatus.ACCEPTED);

      const outboxCountAfter = await prisma.outboxEvent.count({
        where: { tenantId: TEST_TENANT_A, eventType: "kot.status_updated" },
      });

      // No redundant outbox events generated on idempotent replay
      expect(outboxCountAfter).toBe(outboxCountBefore);
    });
  });

  describe("4. Authentication & Role-Based Authorization Guards", () => {
    it("should reject unauthenticated requests with HTTP 401 UNAUTHORIZED", async () => {
      const { kot } = await createTestOrderWithKot();

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/kitchen/kots/${kot.id}/status`,
        payload: { status: "ACCEPTED" },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("should reject unauthorized roles (WAITER) with HTTP 403 FORBIDDEN", async () => {
      const { kot } = await createTestOrderWithKot();

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/kitchen/kots/${kot.id}/status`,
        headers: { authorization: `Bearer ${waiterToken}` },
        payload: { status: "ACCEPTED" },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("FORBIDDEN");
    });

    it("should reject unauthorized roles (CASHIER) with HTTP 403 FORBIDDEN", async () => {
      const { kot } = await createTestOrderWithKot();

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/kitchen/kots/${kot.id}/status`,
        headers: { authorization: `Bearer ${cashierToken}` },
        payload: { status: "ACCEPTED" },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe("FORBIDDEN");
    });

    it("should allow MANAGER role to update KOT status", async () => {
      const { kot } = await createTestOrderWithKot();

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/kitchen/kots/${kot.id}/status`,
        headers: { authorization: `Bearer ${managerToken}` },
        payload: { status: "ACCEPTED" },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.status).toBe(KotStatus.ACCEPTED);
    });
  });

  describe("5. Multi-Tenant Boundary Enforcement", () => {
    it("should return HTTP 404 KOT_NOT_FOUND when staff from Tenant B attempts to access Tenant A KOT", async () => {
      const { kot } = await createTestOrderWithKot(TEST_TENANT_A, KotStatus.NEW);

      // Attempt PATCH from Tenant B user
      const resPatch = await app.inject({
        method: "PATCH",
        url: `/api/v1/kitchen/kots/${kot.id}/status`,
        headers: { authorization: `Bearer ${tenantBToken}` },
        payload: { status: "ACCEPTED" },
      });

      expect(resPatch.statusCode).toBe(404);
      const bodyPatch = JSON.parse(resPatch.body);
      expect(bodyPatch.error.code).toBe("KOT_NOT_FOUND");

      // Attempt GET from Tenant B user
      const resGet = await app.inject({
        method: "GET",
        url: `/api/v1/kitchen/kots/${kot.id}`,
        headers: { authorization: `Bearer ${tenantBToken}` },
      });

      expect(resGet.statusCode).toBe(404);
    });
  });

  describe("6. Multi-KOT Parent Order Progress Rules", () => {
    it("should NOT mark parent order READY or SERVED if other KOTs are still cooking", async () => {
      const timestamp = Date.now();
      const order = await prisma.order.create({
        data: {
          tenantId: TEST_TENANT_A,
          orderNumber: `ORD-MULTI-${timestamp}`,
          source: "CUSTOMER_QR",
          status: OrderStatus.CONFIRMED,
          paymentPreference: "PAY_LATER",
          subtotal: 500.0,
          taxTotal: 25.0,
          grandTotal: 525.0,
        },
      });
      createdOrderIds.push(order.id);

      // KOT 1 (Starters)
      const kot1 = await prisma.kot.create({
        data: {
          orderId: order.id,
          kotNumber: `KOT-M1-${timestamp}`,
          status: KotStatus.ACCEPTED,
        },
      });

      // KOT 2 (Mains)
      const kot2 = await prisma.kot.create({
        data: {
          orderId: order.id,
          kotNumber: `KOT-M2-${timestamp}`,
          status: KotStatus.NEW,
        },
      });

      // Advance KOT 1 to PREPARING
      await kitchenService.updateKotStatus(TEST_TENANT_A, kot1.id, "PREPARING");
      let currentOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(currentOrder?.status).toBe(OrderStatus.PREPARING);

      // Advance KOT 1 to READY (KOT 2 is still NEW!)
      await kitchenService.updateKotStatus(TEST_TENANT_A, kot1.id, "READY");
      currentOrder = await prisma.order.findUnique({ where: { id: order.id } });
      // Invariant: Order CANNOT be marked READY because KOT 2 is still pending!
      expect(currentOrder?.status).toBe(OrderStatus.PREPARING);

      // Advance KOT 1 to SERVED (KOT 2 is still NEW!)
      await kitchenService.updateKotStatus(TEST_TENANT_A, kot1.id, "SERVED");
      currentOrder = await prisma.order.findUnique({ where: { id: order.id } });
      // Invariant: Order CANNOT be marked SERVED because KOT 2 is still pending!
      expect(currentOrder?.status).toBe(OrderStatus.PREPARING);

      // Now advance KOT 2 through lifecycle
      await kitchenService.updateKotStatus(TEST_TENANT_A, kot2.id, "ACCEPTED");
      await kitchenService.updateKotStatus(TEST_TENANT_A, kot2.id, "PREPARING");
      await kitchenService.updateKotStatus(TEST_TENANT_A, kot2.id, "READY");

      currentOrder = await prisma.order.findUnique({ where: { id: order.id } });
      // Now KOT 1 is SERVED and KOT 2 is READY -> Order is READY!
      expect(currentOrder?.status).toBe(OrderStatus.READY);

      // Serve KOT 2 -> All KOTs are now SERVED!
      await kitchenService.updateKotStatus(TEST_TENANT_A, kot2.id, "SERVED");
      currentOrder = await prisma.order.findUnique({ where: { id: order.id } });
      expect(currentOrder?.status).toBe(OrderStatus.SERVED);
    });
  });

  describe("7. Concurrency-Safe Row Locking & Race Condition Protection", () => {
    it("should handle concurrent status updates safely with PostgreSQL row locking", async () => {
      const { kot } = await createTestOrderWithKot(TEST_TENANT_A, KotStatus.NEW);

      // Simulate 2 concurrent requests from two chefs tapping "Accept Ticket" simultaneously
      const [res1, res2] = await Promise.all([
        app.inject({
          method: "PATCH",
          url: `/api/v1/kitchen/kots/${kot.id}/status`,
          headers: { authorization: `Bearer ${kitchenToken}` },
          payload: { status: "ACCEPTED" },
        }),
        app.inject({
          method: "PATCH",
          url: `/api/v1/kitchen/kots/${kot.id}/status`,
          headers: { authorization: `Bearer ${kitchenToken}` },
          payload: { status: "ACCEPTED" },
        }),
      ]);

      // Both requests must complete cleanly with 200 OK (one applied the change, the other safely no-opped)
      expect(res1.statusCode).toBe(200);
      expect(res2.statusCode).toBe(200);

      const finalKot = await prisma.kot.findUnique({ where: { id: kot.id } });
      expect(finalKot?.status).toBe(KotStatus.ACCEPTED);
    });
  });

  describe("8. Transactional Outbox Events & Topic Scoping", () => {
    it("should record transactional outbox event on kitchen:kots and kot.ready on orders:all", async () => {
      const { kot } = await createTestOrderWithKot(TEST_TENANT_A, KotStatus.PREPARING);

      const res = await app.inject({
        method: "PATCH",
        url: `/api/v1/kitchen/kots/${kot.id}/status`,
        headers: { authorization: `Bearer ${kitchenToken}` },
        payload: { status: "READY" },
      });

      expect(res.statusCode).toBe(200);

      // Verify kot.status_updated outbox event
      const kotOutbox = await prisma.outboxEvent.findFirst({
        where: {
          tenantId: TEST_TENANT_A,
          eventType: "kot.status_updated",
          topic: "kitchen:kots",
        },
        orderBy: { createdAt: "desc" },
      });

      expect(kotOutbox).toBeDefined();
      const kotPayload = kotOutbox?.payload as any;
      expect(kotPayload.kotId).toBe(kot.id);
      expect(kotPayload.status).toBe(KotStatus.READY);
      expect(kotPayload.previousStatus).toBe(KotStatus.PREPARING);

      // Verify kot.ready outbox event on orders:all for waiter notifications
      const readyOutbox = await prisma.outboxEvent.findFirst({
        where: {
          tenantId: TEST_TENANT_A,
          eventType: "kot.ready",
          topic: "orders:all",
        },
        orderBy: { createdAt: "desc" },
      });

      expect(readyOutbox).toBeDefined();
      const readyPayload = readyOutbox?.payload as any;
      expect(readyPayload.kotId).toBe(kot.id);
      expect(readyPayload.orderId).toBe(kot.orderId);
    });
  });

  describe("9. Kitchen Query Endpoints (GET /kots & GET /kots/:id)", () => {
    it("should retrieve active KOTs with complete item and context formatting", async () => {
      const { kot } = await createTestOrderWithKot(TEST_TENANT_A, KotStatus.ACCEPTED);

      const res = await app.inject({
        method: "GET",
        url: "/api/v1/kitchen/kots",
        headers: { authorization: `Bearer ${kitchenToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);

      const found = body.data.find((k: any) => k.id === kot.id);
      expect(found).toBeDefined();
      expect(found.kotNumber).toBe(kot.kotNumber);
      expect(found.qrContext.type).toBe("TABLE");
      expect(found.items.length).toBeGreaterThan(0);
      expect(found.items[0].name).toBe("KDS Crispy Corn");
      expect(found.urgency).toBeDefined();
    });

    it("should retrieve single KOT ticket by ID", async () => {
      const { kot } = await createTestOrderWithKot(TEST_TENANT_A, KotStatus.PREPARING);

      const res = await app.inject({
        method: "GET",
        url: `/api/v1/kitchen/kots/${kot.id}`,
        headers: { authorization: `Bearer ${kitchenToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.id).toBe(kot.id);
      expect(body.data.status).toBe(KotStatus.PREPARING);
    });
  });
});
