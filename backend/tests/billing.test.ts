import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma, disconnectPrisma } from "../src/lib/prisma.js";
import {
  BillPaymentStatus,
  OrderStatus,
  PaymentRecordStatus,
  TableStatus,
  RoomStatus,
} from "@prisma/client";

const TEST_TENANT_A = "e1b1d1f0-0000-4000-8000-000000000001";
const TEST_TENANT_B = "00000000-0000-4000-8000-000000000099";

describe("SCULPX E-Billing — Phase 4: Billing, Invoices, Payments & Settlement Suite", { timeout: 45000 }, () => {
  let app: FastifyInstance;

  let cashierUser: any;
  let managerUser: any;
  let waiterUser: any;
  let kitchenUser: any;
  let tenantBUser: any;

  let cashierToken: string;
  let managerToken: string;
  let waiterToken: string;
  let kitchenToken: string;
  let tenantBToken: string;

  let testTableId: string;
  let testRoomId: string;
  let testMenuItem: any;

  const createdOrderIds: string[] = [];
  const createdBillIds: string[] = [];

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Users setup
    cashierUser = await prisma.user.findFirst({
      where: { tenantId: TEST_TENANT_A, role: "CASHIER", isActive: true },
    });
    if (!cashierUser) {
      cashierUser = await prisma.user.create({
        data: {
          tenantId: TEST_TENANT_A,
          email: `cashier-p4-${Date.now()}@demo.com`,
          name: "Phase 4 Cashier",
          role: "CASHIER",
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
          email: `manager-p4-${Date.now()}@demo.com`,
          name: "Phase 4 Manager",
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
          email: `waiter-p4-${Date.now()}@demo.com`,
          name: "Phase 4 Waiter",
          role: "WAITER",
          passwordHash: "dummy",
        },
      });
    }

    kitchenUser = await prisma.user.findFirst({
      where: { tenantId: TEST_TENANT_A, role: "KITCHEN_STAFF", isActive: true },
    });
    if (!kitchenUser) {
      kitchenUser = await prisma.user.create({
        data: {
          tenantId: TEST_TENANT_A,
          email: `kitchen-p4-${Date.now()}@demo.com`,
          name: "Phase 4 Kitchen",
          role: "KITCHEN_STAFF",
          passwordHash: "dummy",
        },
      });
    }

    tenantBUser = await prisma.user.findFirst({
      where: { tenantId: TEST_TENANT_B, role: "CASHIER", isActive: true },
    });
    if (!tenantBUser) {
      tenantBUser = await prisma.user.create({
        data: {
          tenantId: TEST_TENANT_B,
          email: `cashier-b-${Date.now()}@foreign.com`,
          name: "Tenant B Cashier",
          role: "CASHIER",
          passwordHash: "dummy",
        },
      });
    }

    // Sign tokens
    cashierToken = app.jwt.sign({
      sub: cashierUser.id,
      email: cashierUser.email,
      role: cashierUser.role,
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

    kitchenToken = app.jwt.sign({
      sub: kitchenUser.id,
      email: kitchenUser.email,
      role: kitchenUser.role,
      tenantId: TEST_TENANT_A,
    });

    tenantBToken = app.jwt.sign({
      sub: tenantBUser.id,
      email: tenantBUser.email,
      role: tenantBUser.role,
      tenantId: TEST_TENANT_B,
    });

    // 2. Setup Dining Table
    const table = await prisma.table.create({
      data: {
        tenantId: TEST_TENANT_A,
        tableNumber: `BT-${Date.now().toString().slice(-4)}`,
        displayName: "Billing Test Table",
        capacity: 4,
        status: TableStatus.OCCUPIED,
      },
    });
    testTableId = table.id;

    // 3. Setup Hotel Room
    const room = await prisma.room.create({
      data: {
        tenantId: TEST_TENANT_A,
        roomNumber: `R-${Date.now().toString().slice(-3)}`,
        floor: "2",
        status: RoomStatus.OCCUPIED,
        guestName: "Roy Rogers",
      },
    });
    testRoomId = room.id;

    // 4. Setup Menu Category and Item
    const category = await prisma.menuCategory.create({
      data: {
        tenantId: TEST_TENANT_A,
        name: "Billing Test Cat",
      },
    });

    testMenuItem = await prisma.menuItem.create({
      data: {
        categoryId: category.id,
        name: "Butter Chicken Special",
        price: 400.0,
        taxRatePercentage: 5.0,
      },
    });
  });

  afterAll(async () => {
    // Clean up created bills, orders, tables, rooms
    if (createdBillIds.length > 0) {
      await prisma.payment.deleteMany({
        where: { billId: { in: createdBillIds } },
      }).catch(() => {});
      await prisma.billItem.deleteMany({
        where: { billId: { in: createdBillIds } },
      }).catch(() => {});
      await prisma.bill.deleteMany({
        where: { id: { in: createdBillIds } },
      }).catch(() => {});
    }

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

    if (testTableId) {
      await prisma.table.delete({ where: { id: testTableId } }).catch(() => {});
    }
    if (testRoomId) {
      await prisma.room.delete({ where: { id: testRoomId } }).catch(() => {});
    }

    await app.close();
    await disconnectPrisma();
  });

  // Helper to create an eligible test order
  async function createTestOrder(options: {
    tenantId?: string;
    status?: OrderStatus;
    tableId?: string;
    roomId?: string;
    itemPrice?: number;
    quantity?: number;
  } = {}) {
    const tenantId = options.tenantId || TEST_TENANT_A;
    const status = options.status || OrderStatus.SERVED;
    const itemPrice = options.itemPrice || 400.0;
    const quantity = options.quantity || 2;
    const lineTotal = itemPrice * quantity;
    const taxTotal = lineTotal * 0.05;
    const grandTotal = lineTotal + taxTotal;

    const orderNumber = `ORD-TEST-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

    const order = await prisma.order.create({
      data: {
        tenantId,
        orderNumber,
        source: "STAFF_POS",
        status,
        paymentPreference: "PAY_LATER",
        tableId: options.tableId || (options.roomId ? null : testTableId),
        roomId: options.roomId || null,
        subtotal: lineTotal,
        taxTotal,
        serviceCharge: 0.0,
        grandTotal,
        items: {
          create: [
            {
              menuItemId: testMenuItem.id,
              itemName: testMenuItem.name,
              quantity,
              unitPrice: itemPrice,
              totalPrice: lineTotal,
              taxAmount: taxTotal,
              status: "SERVED",
            },
          ],
        },
      },
      include: {
        items: true,
      },
    });

    createdOrderIds.push(order.id);
    return order;
  }

  // =========================================================================
  // 1. INVOICE GENERATION & SNAPSHOT ACCURACY
  // =========================================================================
  describe("Phase 4A: Bill Generation and Invoice Snapshots", () => {
    it("should generate a tax invoice with CGST 2.5% + SGST 2.5% and sequential INV- number", async () => {
      const order = await createTestOrder({ itemPrice: 400, quantity: 2 }); // subtotal 800

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/bills/order/${order.id}/generate`,
        headers: {
          authorization: `Bearer ${cashierToken}`,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data).toBeDefined();

      const bill = body.data;
      createdBillIds.push(bill.id);

      // Verify numbering format: INV-YYYYMMDD-XXXX
      expect(bill.billNumber).toMatch(/^INV-\d{8}-\d{4}$/);
      expect(bill.orderId).toBe(order.id);
      expect(bill.status).toBe("ISSUED");
      expect(bill.paymentStatus).toBe("UNPAID");

      // Verify financial breakdown:
      // Subtotal: 800.00
      // CGST (2.5%): 20.00
      // SGST (2.5%): 20.00
      // Total Tax: 40.00
      // Grand Total: 840.00
      // Due Amount: 840.00
      expect(bill.subtotal).toBe(800.0);
      expect(bill.totalTax).toBe(40.0);
      expect(bill.grandTotal).toBe(840.0);
      expect(bill.dueAmount).toBe(840.0);
      expect(bill.paidAmount).toBe(0.0);

      expect(bill.taxes).toHaveLength(2);
      expect(bill.taxes).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: "CGST (2.5%)", ratePercentage: 2.5, amount: 20 }),
          expect.objectContaining({ name: "SGST (2.5%)", ratePercentage: 2.5, amount: 20 }),
        ])
      );

      // Verify immutable items snapshot
      expect(bill.items).toHaveLength(1);
      expect(bill.items[0].name).toBe(testMenuItem.name);
      expect(bill.items[0].quantity).toBe(2);
      expect(bill.items[0].unitPrice).toBe(400.0);
      expect(bill.items[0].totalPrice).toBe(800.0);

      // Verify table status is updated to BILL_REQUESTED (not released yet)
      const tableInDb = await prisma.table.findUnique({ where: { id: testTableId } });
      expect(tableInDb?.status).toBe(TableStatus.BILL_REQUESTED);
    });

    it("should idempotently return existing invoice without creating duplicate on repeated requests", async () => {
      const order = await createTestOrder({ itemPrice: 250, quantity: 2 }); // subtotal 500

      // First call
      const res1 = await app.inject({
        method: "POST",
        url: `/api/v1/bills/order/${order.id}/generate`,
        headers: { authorization: `Bearer ${cashierToken}` },
      });
      expect(res1.statusCode).toBe(201);
      const bill1 = res1.json().data;
      createdBillIds.push(bill1.id);

      // Second call (concurrent retry replay)
      const res2 = await app.inject({
        method: "POST",
        url: `/api/v1/bills/order/${order.id}/generate`,
        headers: { authorization: `Bearer ${cashierToken}` },
      });
      expect(res2.statusCode).toBe(201);
      const bill2 = res2.json().data;

      // Must return identical invoice
      expect(bill2.id).toBe(bill1.id);
      expect(bill2.billNumber).toBe(bill1.billNumber);
      expect(bill2.grandTotal).toBe(bill1.grandTotal);

      // Verify only 1 bill exists in database for this order
      const count = await prisma.bill.count({ where: { orderId: order.id } });
      expect(count).toBe(1);
    });

    it("should reject bill generation for cancelled order with HTTP 400 ORDER_NOT_ELIGIBLE", async () => {
      const cancelledOrder = await createTestOrder({ status: OrderStatus.CANCELLED });

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/bills/order/${cancelledOrder.id}/generate`,
        headers: { authorization: `Bearer ${cashierToken}` },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("ORDER_NOT_ELIGIBLE");
    });

    it("should reject bill generation for non-existent order with HTTP 404 ORDER_NOT_FOUND", async () => {
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/bills/order/00000000-0000-4000-8000-000000000999/generate`,
        headers: { authorization: `Bearer ${cashierToken}` },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("ORDER_NOT_FOUND");
    });

    it("should reject unauthorized roles (WAITER, KITCHEN_STAFF) from generating invoices with HTTP 403", async () => {
      const order = await createTestOrder();

      const waiterRes = await app.inject({
        method: "POST",
        url: `/api/v1/bills/order/${order.id}/generate`,
        headers: { authorization: `Bearer ${waiterToken}` },
      });
      expect(waiterRes.statusCode).toBe(403);

      const kitchenRes = await app.inject({
        method: "POST",
        url: `/api/v1/bills/order/${order.id}/generate`,
        headers: { authorization: `Bearer ${kitchenToken}` },
      });
      expect(kitchenRes.statusCode).toBe(403);
    });

    it("should prevent cross-tenant bill generation and return HTTP 404", async () => {
      const orderTenantA = await createTestOrder();

      // Cashier of Tenant B attempts to generate bill for Tenant A order
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/bills/order/${orderTenantA.id}/generate`,
        headers: { authorization: `Bearer ${tenantBToken}` },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("ORDER_NOT_FOUND");
    });
  });

  // =========================================================================
  // 2. INVOICE RETRIEVAL & HISTORICAL PRICE IMMUTABILITY
  // =========================================================================
  describe("Phase 4B: Bill Inspection & Immutability", () => {
    it("should retrieve bill by ID and by order ID", async () => {
      const order = await createTestOrder({ itemPrice: 150, quantity: 2 });
      const genRes = await app.inject({
        method: "POST",
        url: `/api/v1/bills/order/${order.id}/generate`,
        headers: { authorization: `Bearer ${cashierToken}` },
      });
      const bill = genRes.json().data;
      createdBillIds.push(bill.id);

      // Retrieve by bill ID
      const byIdRes = await app.inject({
        method: "GET",
        url: `/api/v1/bills/${bill.id}`,
      });
      expect(byIdRes.statusCode).toBe(200);
      expect(byIdRes.json().data.id).toBe(bill.id);

      // Retrieve by order ID
      const byOrderRes = await app.inject({
        method: "GET",
        url: `/api/v1/bills/order/${order.id}`,
      });
      expect(byOrderRes.statusCode).toBe(200);
      expect(byOrderRes.json().data.billNumber).toBe(bill.billNumber);
    });

    it("should preserve historical item prices on bill even if menu catalog item price changes", async () => {
      const order = await createTestOrder({ itemPrice: 400, quantity: 1 });
      const genRes = await app.inject({
        method: "POST",
        url: `/api/v1/bills/order/${order.id}/generate`,
        headers: { authorization: `Bearer ${cashierToken}` },
      });
      const bill = genRes.json().data;
      createdBillIds.push(bill.id);

      // Price on bill item snapshot was 400
      expect(bill.items[0].unitPrice).toBe(400.0);

      // Now mutate menu item price in catalog from 400 to 999
      await prisma.menuItem.update({
        where: { id: testMenuItem.id },
        data: { price: 999.0 },
      });

      // Retrieve the historical bill again
      const fetchRes = await app.inject({
        method: "GET",
        url: `/api/v1/bills/${bill.id}`,
      });
      const fetchedBill = fetchRes.json().data;

      // Price on historical invoice MUST remain 400, NOT 999
      expect(fetchedBill.items[0].unitPrice).toBe(400.0);
      expect(fetchedBill.subtotal).toBe(400.0);

      // Restore menu item price
      await prisma.menuItem.update({
        where: { id: testMenuItem.id },
        data: { price: 400.0 },
      });
    });

    it("should list paginated bills for tenant", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/bills?page=1&limit=10",
        headers: { authorization: `Bearer ${cashierToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data.data)).toBe(true);
      expect(body.data.total).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // 3. DISCOUNTS & VOIDING
  // =========================================================================
  describe("Phase 4B: Discounts and Invoice Voiding", () => {
    it("should allow MANAGER to apply percentage discount and recalculate taxes", async () => {
      const order = await createTestOrder({ itemPrice: 1000, quantity: 1 }); // subtotal 1000
      const genRes = await app.inject({
        method: "POST",
        url: `/api/v1/bills/order/${order.id}/generate`,
        headers: { authorization: `Bearer ${cashierToken}` },
      });
      const bill = genRes.json().data;
      createdBillIds.push(bill.id);

      // Manager applies 10% discount (₹100 off)
      const discRes = await app.inject({
        method: "POST",
        url: `/api/v1/bills/${bill.id}/discount`,
        headers: { authorization: `Bearer ${managerToken}` },
        payload: {
          type: "PERCENTAGE",
          value: 10,
          code: "PROMO10",
        },
      });

      expect(discRes.statusCode).toBe(200);
      const updated = discRes.json().data;

      // Subtotal: 1000
      // Discount: 100
      // Discounted Subtotal: 900
      // CGST (2.5% on 900): 22.50
      // SGST (2.5% on 900): 22.50
      // Total Tax: 45.00
      // Grand Total: 945.00
      expect(updated.totalDiscount).toBe(100.0);
      expect(updated.totalTax).toBe(45.0);
      expect(updated.grandTotal).toBe(945.0);
      expect(updated.dueAmount).toBe(945.0);
    });

    it("should reject CASHIER from applying discount with HTTP 403", async () => {
      const order = await createTestOrder({ itemPrice: 500, quantity: 1 });
      const genRes = await app.inject({
        method: "POST",
        url: `/api/v1/bills/order/${order.id}/generate`,
        headers: { authorization: `Bearer ${cashierToken}` },
      });
      const bill = genRes.json().data;
      createdBillIds.push(bill.id);

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/bills/${bill.id}/discount`,
        headers: { authorization: `Bearer ${cashierToken}` },
        payload: { type: "FLAT", value: 50 },
      });

      expect(res.statusCode).toBe(403);
    });

    it("should allow MANAGER to void an unpaid bill with non-empty reason", async () => {
      const order = await createTestOrder({ itemPrice: 300, quantity: 1 });
      const genRes = await app.inject({
        method: "POST",
        url: `/api/v1/bills/order/${order.id}/generate`,
        headers: { authorization: `Bearer ${cashierToken}` },
      });
      const bill = genRes.json().data;
      createdBillIds.push(bill.id);

      const voidRes = await app.inject({
        method: "POST",
        url: `/api/v1/bills/${bill.id}/void`,
        headers: { authorization: `Bearer ${managerToken}` },
        payload: { reason: "Customer left before food arrived (walkout)" },
      });

      expect(voidRes.statusCode).toBe(200);
      const voided = voidRes.json().data;
      expect(voided.status).toBe("VOIDED");
      expect(voided.paymentStatus).toBe("VOIDED");
      expect(voided.voidedReason).toBe("Customer left before food arrived (walkout)");
    });
  });

  // =========================================================================
  // 4. PAYMENTS & SETTLEMENT
  // =========================================================================
  describe("Phase 4C: Payments & Settlement", () => {
    it("should record partial payment, update due amount, and transition to PARTIALLY_PAID", async () => {
      const dedicatedTable = await prisma.table.create({
        data: {
          tenantId: TEST_TENANT_A,
          tableNumber: `ST-${Date.now().toString().slice(-4)}`,
          displayName: "Settlement Table",
          capacity: 2,
          status: TableStatus.OCCUPIED,
        },
      });

      const order = await createTestOrder({
        tableId: dedicatedTable.id,
        itemPrice: 500,
        quantity: 2,
      }); // subtotal 1000 + 50 tax = 1050

      const genRes = await app.inject({
        method: "POST",
        url: `/api/v1/bills/order/${order.id}/generate`,
        headers: { authorization: `Bearer ${cashierToken}` },
      });
      const bill = genRes.json().data;
      createdBillIds.push(bill.id);

      expect(bill.grandTotal).toBe(1050.0);
      expect(bill.dueAmount).toBe(1050.0);

      // 1. Partial payment of 450 via UPI
      const pay1Res = await app.inject({
        method: "POST",
        url: `/api/v1/bills/${bill.id}/payments`,
        headers: { authorization: `Bearer ${cashierToken}` },
        payload: {
          amount: 450.0,
          method: "UPI",
          transactionReference: "UPI-TEST-12345",
        },
      });

      expect(pay1Res.statusCode).toBe(200);
      const pay1 = pay1Res.json().data;
      expect(pay1.amount).toBe(450.0);
      expect(pay1.paidAmount).toBe(450.0);
      expect(pay1.dueAmount).toBe(600.0);
      expect(pay1.billStatus).toBe("PARTIALLY_PAID");

      // Verify bill state via GET
      const billCheck = await app.inject({
        method: "GET",
        url: `/api/v1/bills/${bill.id}`,
      });
      const checkData = billCheck.json().data;
      expect(checkData.status).toBe("PARTIALLY_PAID");
      expect(checkData.paidAmount).toBe(450.0);
      expect(checkData.dueAmount).toBe(600.0);
      expect(checkData.payments).toHaveLength(1);

      // 2. Final settlement payment of 600 via CASH
      const pay2Res = await app.inject({
        method: "POST",
        url: `/api/v1/bills/${bill.id}/payments`,
        headers: { authorization: `Bearer ${cashierToken}` },
        payload: {
          amount: 600.0,
          method: "CASH",
        },
      });

      expect(pay2Res.statusCode).toBe(200);
      const pay2 = pay2Res.json().data;
      expect(pay2.amount).toBe(600.0);
      expect(pay2.paidAmount).toBe(1050.0);
      expect(pay2.dueAmount).toBe(0.0);
      expect(pay2.billStatus).toBe("PAID");

      // Verify final settled bill
      const finalBillRes = await app.inject({
        method: "GET",
        url: `/api/v1/bills/${bill.id}`,
      });
      const finalBill = finalBillRes.json().data;
      expect(finalBill.status).toBe("PAID");
      expect(finalBill.paymentStatus).toBe("PAID");
      expect(finalBill.dueAmount).toBe(0.0);
      expect(finalBill.payments).toHaveLength(2);

      // Parent order must be marked COMPLETED
      const orderInDb = await prisma.order.findUnique({ where: { id: order.id } });
      expect(orderInDb?.status).toBe(OrderStatus.COMPLETED);

      // Table must be released to VACANT
      const tableInDb = await prisma.table.findUnique({ where: { id: dedicatedTable.id } });
      expect(tableInDb?.status).toBe(TableStatus.VACANT);

      await prisma.table.delete({ where: { id: dedicatedTable.id } }).catch(() => {});
    });

    it("should enforce payment idempotency and prevent duplicate double-charge on network retry", async () => {
      const order = await createTestOrder({ itemPrice: 200, quantity: 1 }); // 200 + 10 tax = 210
      const genRes = await app.inject({
        method: "POST",
        url: `/api/v1/bills/order/${order.id}/generate`,
        headers: { authorization: `Bearer ${cashierToken}` },
      });
      const bill = genRes.json().data;
      createdBillIds.push(bill.id);

      const idempotencyKey = `idemp-pay-${Date.now()}-${Math.random()}`;

      const payload = {
        amount: 210.0,
        method: "CARD",
        cardLastFour: "4444",
      };

      // First payment submission
      const res1 = await app.inject({
        method: "POST",
        url: `/api/v1/bills/${bill.id}/payments`,
        headers: {
          authorization: `Bearer ${cashierToken}`,
          "idempotency-key": idempotencyKey,
        },
        payload,
      });

      expect(res1.statusCode).toBe(200);
      const payment1 = res1.json().data;

      // Duplicate submission with identical key and payload (network retry)
      const res2 = await app.inject({
        method: "POST",
        url: `/api/v1/bills/${bill.id}/payments`,
        headers: {
          authorization: `Bearer ${cashierToken}`,
          "idempotency-key": idempotencyKey,
        },
        payload,
      });

      expect(res2.statusCode).toBe(200);
      const payment2 = res2.json().data;

      // Must return same payment ID
      expect(payment2.id).toBe(payment1.id);

      // Verify database has only ONE payment recorded
      const count = await prisma.payment.count({ where: { billId: bill.id } });
      expect(count).toBe(1);
    });

    it("should reject idempotency key reuse with mismatched payload with HTTP 409 IDEMPOTENCY_CONFLICT", async () => {
      const order = await createTestOrder({ itemPrice: 200, quantity: 1 });
      const genRes = await app.inject({
        method: "POST",
        url: `/api/v1/bills/order/${order.id}/generate`,
        headers: { authorization: `Bearer ${cashierToken}` },
      });
      const bill = genRes.json().data;
      createdBillIds.push(bill.id);

      const idempotencyKey = `idemp-conflict-${Date.now()}`;

      // Call 1
      await app.inject({
        method: "POST",
        url: `/api/v1/bills/${bill.id}/payments`,
        headers: {
          authorization: `Bearer ${cashierToken}`,
          "idempotency-key": idempotencyKey,
        },
        payload: { amount: 100.0, method: "CASH" },
      });

      // Call 2 with different amount on same key
      const conflictRes = await app.inject({
        method: "POST",
        url: `/api/v1/bills/${bill.id}/payments`,
        headers: {
          authorization: `Bearer ${cashierToken}`,
          "idempotency-key": idempotencyKey,
        },
        payload: { amount: 200.0, method: "CASH" },
      });

      expect(conflictRes.statusCode).toBe(409);
      expect(conflictRes.json().error.code).toBe("IDEMPOTENCY_CONFLICT");
    });

    it("should reject overpayment exceeding outstanding balance with HTTP 400 PAYMENT_EXCEEDS_DUE", async () => {
      const order = await createTestOrder({ itemPrice: 100, quantity: 1 }); // 100 + 5 tax = 105
      const genRes = await app.inject({
        method: "POST",
        url: `/api/v1/bills/order/${order.id}/generate`,
        headers: { authorization: `Bearer ${cashierToken}` },
      });
      const bill = genRes.json().data;
      createdBillIds.push(bill.id);

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/bills/${bill.id}/payments`,
        headers: { authorization: `Bearer ${cashierToken}` },
        payload: {
          amount: 500.0, // Bill is only 105
          method: "CASH",
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("PAYMENT_EXCEEDS_DUE");
    });

    it("should accept ROOM_CHARGE tender for hotel room order and post to room ledger", async () => {
      // Room order
      const roomOrder = await createTestOrder({
        roomId: testRoomId,
        tableId: undefined,
        itemPrice: 600,
        quantity: 1,
      });

      const genRes = await app.inject({
        method: "POST",
        url: `/api/v1/bills/order/${roomOrder.id}/generate`,
        headers: { authorization: `Bearer ${cashierToken}` },
      });
      const bill = genRes.json().data;
      createdBillIds.push(bill.id);

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/bills/${bill.id}/payments`,
        headers: { authorization: `Bearer ${cashierToken}` },
        payload: {
          amount: bill.grandTotal,
          method: "ROOM_CHARGE",
          roomChargeDetails: {
            roomNumber: "R-101",
            guestName: "Roy Rogers",
          },
        },
      });

      expect(res.statusCode).toBe(200);
      const payment = res.json().data;
      expect(payment.method).toBe("ROOM_CHARGE");
      expect(payment.billStatus).toBe("PAID");

      // Verify hotel room occupancy is NOT released (remains OCCUPIED)
      const roomInDb = await prisma.room.findUnique({ where: { id: testRoomId } });
      expect(roomInDb?.status).toBe(RoomStatus.OCCUPIED);
    });

    it("should reject ROOM_CHARGE for a dining table order with HTTP 400 INVALID_ROOM_CHARGE", async () => {
      const tableOrder = await createTestOrder({ tableId: testTableId });
      const genRes = await app.inject({
        method: "POST",
        url: `/api/v1/bills/order/${tableOrder.id}/generate`,
        headers: { authorization: `Bearer ${cashierToken}` },
      });
      const bill = genRes.json().data;
      createdBillIds.push(bill.id);

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/bills/${bill.id}/payments`,
        headers: { authorization: `Bearer ${cashierToken}` },
        payload: {
          amount: bill.grandTotal,
          method: "ROOM_CHARGE",
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("INVALID_ROOM_CHARGE");
    });

    it("should handle concurrent invoice generation for the same order safely without duplicate bills", async () => {
      const order = await createTestOrder({ itemPrice: 300, quantity: 1 });
      const [res1, res2] = await Promise.all([
        app.inject({
          method: "POST",
          url: `/api/v1/bills/order/${order.id}/generate`,
          headers: { authorization: `Bearer ${cashierToken}` },
        }),
        app.inject({
          method: "POST",
          url: `/api/v1/bills/order/${order.id}/generate`,
          headers: { authorization: `Bearer ${cashierToken}` },
        }),
      ]);

      expect([200, 201]).toContain(res1.statusCode);
      expect([200, 201]).toContain(res2.statusCode);
      const bill1 = res1.json().data;
      const bill2 = res2.json().data;
      expect(bill1.id).toBe(bill2.id);
      expect(bill1.billNumber).toBe(bill2.billNumber);
      createdBillIds.push(bill1.id);

      const dbBills = await prisma.bill.findMany({ where: { orderId: order.id } });
      expect(dbBills).toHaveLength(1);
    });

    it("should prevent concurrent payments from exceeding outstanding balance", async () => {
      const order = await createTestOrder({ itemPrice: 200, quantity: 1 }); // 200 + 10 tax = 210
      const genRes = await app.inject({
        method: "POST",
        url: `/api/v1/bills/order/${order.id}/generate`,
        headers: { authorization: `Bearer ${cashierToken}` },
      });
      const bill = genRes.json().data;
      createdBillIds.push(bill.id);

      // Two concurrent requests each trying to pay 150 (total 300 > 210)
      const [res1, res2] = await Promise.all([
        app.inject({
          method: "POST",
          url: `/api/v1/bills/${bill.id}/payments`,
          headers: { authorization: `Bearer ${cashierToken}` },
          payload: { amount: 150, method: "CASH" },
        }),
        app.inject({
          method: "POST",
          url: `/api/v1/bills/${bill.id}/payments`,
          headers: { authorization: `Bearer ${cashierToken}` },
          payload: { amount: 150, method: "CASH" },
        }),
      ]);

      const statusCodes = [res1.statusCode, res2.statusCode].sort();
      expect(statusCodes).toEqual([200, 400]);
      const rejectedRes = res1.statusCode === 400 ? res1 : res2;
      expect(rejectedRes.json().error.code).toBe("PAYMENT_EXCEEDS_DUE");

      const paymentsInDb = await prisma.payment.findMany({ where: { billId: bill.id } });
      const totalPaid = paymentsInDb.reduce((s, p) => s + Number(p.amount), 0);
      expect(totalPaid).toBe(150);
    });
  });
});
