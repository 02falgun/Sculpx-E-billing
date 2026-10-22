import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import WebSocket from "ws";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/database/prisma.js";
import { apiClient } from "@/services/api/client";
import { HttpAuthService } from "@/services/api/http/auth.http";
import { HttpMenuService } from "@/services/api/http/menu.http";
import { HttpOrderService } from "@/services/api/http/order.http";
import { HttpKitchenService } from "@/services/api/http/kitchen.http";
import { HttpBillingService } from "@/services/api/http/billing.http";
import { HttpPaymentService } from "@/services/api/http/payment.http";
import { HttpPrinterService } from "@/services/api/http/printer.http";

describe("SCULPX E-Billing — Live Frontend Client & Real Fastify API Integration", () => {
  let app: FastifyInstance;
  let serverUrl: string;
  let wsUrl: string;

  const authService = new HttpAuthService();
  const menuService = new HttpMenuService();
  const orderService = new HttpOrderService();
  const kitchenService = new HttpKitchenService();
  const billingService = new HttpBillingService();
  const paymentService = new HttpPaymentService();
  const printerService = new HttpPrinterService();

  let adminToken: string;
  let tenantId: string;
  let createdOrderId: string;
  let generatedKotId: string;
  let generatedBillId: string;
  let testPrinterId: string;

  beforeAll(async () => {
    // 1. Start Fastify instance on an ephemeral local port
    app = await buildApp();
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    serverUrl = address;

    const port = (app.server.address() as any).port;
    wsUrl = `ws://127.0.0.1:${port}/ws`;

    // 2. Configure frontend ApiClient to point to the live server
    apiClient.setBaseUrl(`${serverUrl}/api/v1`);
  });

  afterAll(async () => {
    await app.close();
  });

  it("1. Staff Authentication: logs in via HttpAuthService, receives valid JWT, and configures ApiClient", async () => {
    const res = await authService.login({
      email: "admin@demo.com",
      pinOrPassword: "demo-secure-pass",
    });

    if (!res.success) {
      console.error("DEBUG LOGIN RES:", JSON.stringify(res));
    }

    expect(res.success).toBe(true);
    expect(res.data.token).toBeDefined();
    expect(res.data.user.role).toBe("ADMIN");

    adminToken = res.data.token;
    tenantId = (res.data.user as any).tenantId;

    // Attach token to ApiClient
    apiClient.setAuthToken(adminToken);

    // Verify session profile
    const profile = await authService.getCurrentUser();
    expect(profile.success).toBe(true);
    expect(profile.data.email).toBe("admin@demo.com");
  });

  it("2. Menu Catalog & Context: resolves active categories and menu items from live database", async () => {
    const categoriesRes = await menuService.getCategories();
    expect(categoriesRes.success).toBe(true);
    expect(Array.isArray(categoriesRes.data)).toBe(true);

    const itemsRes = await menuService.getMenuItems();
    expect(itemsRes.success).toBe(true);
    expect(Array.isArray(itemsRes.data)).toBe(true);
    expect(itemsRes.data.length).toBeGreaterThan(0);
  });

  it("3. Order Creation & Idempotency: creates order and deduplicates identical retry keys", async () => {
    // Locate active menu item and table
    const menuItem = await prisma.menuItem.findFirst({
      where: {
        category: { tenantId },
        isAvailable: true,
      },
    });
    expect(menuItem).toBeDefined();

    const table = await prisma.table.findFirst({
      where: { tenantId },
    });
    expect(table).toBeDefined();

    // Ensure table has clean state for testing
    await prisma.table.update({
      where: { id: table!.id },
      data: { currentOrderId: null, status: "VACANT" },
    });

    // Create a fresh guaranteed valid QR code for this test session
    const qrToken = `table-qr-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
    const qr = await prisma.qrCode.create({
      data: {
        tenantId,
        tableId: table!.id,
        token: qrToken,
        type: "TABLE",
        isActive: true,
      },
    });

    const idempotencyKey = crypto.randomUUID();
    const orderPayload = {
      qrToken: qr.token,
      customerName: "Live Integration Tester",
      customerPhone: "+91 99999 11111",
      paymentPreference: "PAY_LATER" as const,
      items: [
        {
          menuItemId: menuItem!.id,
          quantity: 2,
          modifierIds: [],
        },
      ],
    };

    // First attempt: should create order
    const orderRes1 = await apiClient.post<any>("/orders", orderPayload, {
      headers: { "Idempotency-Key": idempotencyKey },
    });

    expect(orderRes1.success).toBe(true);
    expect(orderRes1.data.id).toBeDefined();
    expect(orderRes1.data.status).toBe("CONFIRMED");
    expect(orderRes1.data.orderNumber).toMatch(/^ORD-\d{8}-\d{4}$/);

    createdOrderId = orderRes1.data.id;

    // Second attempt with identical idempotencyKey: must return the exact same order without duplication
    const orderRes2 = await apiClient.post<any>("/orders", orderPayload, {
      headers: { "Idempotency-Key": idempotencyKey },
    });

    expect(orderRes2.success).toBe(true);
    expect(orderRes2.data.id).toBe(createdOrderId);
  });

  it(
    "4. Kitchen KDS Lifecycle: updates KOT status through ACCEPTED -> PREPARING -> READY -> SERVED",
    async () => {
      // Locate the KOT created for this order
      const kot = await prisma.kot.findFirst({
        where: { orderId: createdOrderId },
      });
      expect(kot).toBeDefined();
      generatedKotId = kot!.id;

      // Transition KOT to ACCEPTED
      const acceptRes = await kitchenService.updateKOTStatus(generatedKotId, {
        status: "ACCEPTED" as any,
        note: "KDS acknowledged ticket",
      });
      if (!acceptRes.success) {
        console.error("DEBUG ACCEPT RES:", JSON.stringify(acceptRes));
      }
      expect(acceptRes.success).toBe(true);
      expect(acceptRes.data.status).toBe("ACCEPTED");

      // Transition KOT to PREPARING
      const prepRes = await kitchenService.updateKOTStatus(generatedKotId, {
        status: "PREPARING" as any,
        note: "Chef fired ticket",
      });
      expect(prepRes.success).toBe(true);
      expect(prepRes.data.status).toBe("PREPARING");

      // Transition KOT to READY
      const readyRes = await kitchenService.updateKOTStatus(generatedKotId, {
        status: "READY" as any,
        note: "Plated and expediting",
      });
      expect(readyRes.success).toBe(true);
      expect(readyRes.data.status).toBe("READY");

      // Transition KOT to SERVED
      const servedRes = await kitchenService.updateKOTStatus(generatedKotId, {
        status: "SERVED" as any,
        note: "Runner delivered to table",
      });
      expect(servedRes.success).toBe(true);
      expect(servedRes.data.status).toBe("SERVED");
    },
    60000
  );

  it(
    "5. Billing & Payment Settlement: generates authoritative invoice snapshot and records tender",
    async () => {
      // Generate bill for the served order
      const billRes = await billingService.generateBillForOrder(createdOrderId);
      if (!billRes.success) {
        console.error("DEBUG BILL RES:", JSON.stringify(billRes));
      }
      expect(billRes.success).toBe(true);
      expect(billRes.data.billNumber).toMatch(/^INV-\d{8}-\d{4}$/);
      expect(Number(billRes.data.grandTotal)).toBeGreaterThan(0);

      generatedBillId = billRes.data.id;

      // Record settlement payment
      const paymentRes = await paymentService.recordPayment({
        billId: generatedBillId,
        amount: Number(billRes.data.grandTotal),
        method: "CASH",
      });

      expect(paymentRes.success).toBe(true);
      expect((paymentRes.data as any).billStatus).toBe("PAID");
      expect(Number((paymentRes.data as any).dueAmount)).toBe(0);
    },
    60000
  );

  it("6. Hardware Printer Fleet & Spooler: lists printers, pings socket, and enqueues diagnostic slip", async () => {
    // List printers
    const fleetRes = await printerService.getPrinters();
    if (!fleetRes.success) {
      console.error("DEBUG FLEET RES:", JSON.stringify(fleetRes));
    }
    expect(fleetRes.success).toBe(true);
    expect(Array.isArray(fleetRes.data)).toBe(true);
    expect(fleetRes.data.length).toBeGreaterThan(0);

    testPrinterId = fleetRes.data[0].id;

    // Ping printer socket (real TCP probe with timeout)
    const pingRes = await printerService.pingPrinter(testPrinterId);
    expect(pingRes.success).toBe(true);
    expect(typeof pingRes.data.isOnline).toBe("boolean");

    // Enqueue diagnostic test slip
    const testPrintRes = await printerService.testPrint(testPrinterId);
    expect(testPrintRes.success).toBe(true);
    expect(testPrintRes.data.jobType).toBe("TEST_PAGE");
    expect(testPrintRes.data.status).toBe("QUEUED");

    const jobId = testPrintRes.data.id;

    // Query print jobs list
    const jobsListRes = await printerService.getPrintJobs({
      pagination: { page: 1, limit: 10 },
    });
    expect(jobsListRes.success).toBe(true);
    expect(jobsListRes.data.data.some((j: any) => j.id === jobId)).toBe(true);

    // Cancel the queued diagnostic job safely
    const cancelRes = await printerService.cancelPrintJob(jobId, "Clean test abort");
    expect(cancelRes.success).toBe(true);
    expect(cancelRes.data.status).toBe("CANCELLED");
  });

  it("7. Real-time WebSocket Bus: authenticates over WS and receives live event frames", async () => {
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(`${wsUrl}?token=${adminToken}`);

      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error("WebSocket did not receive expected frames within 5000ms"));
      }, 5000);

      ws.on("open", () => {
        // Subscribe to printers:jobs topic
        ws.send(
          JSON.stringify({
            action: "SUBSCRIBE",
            topic: "printers:jobs",
          })
        );
      });

      ws.on("message", (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "CONNECTION_ESTABLISHED" || msg.type === "AUTHENTICATED" || msg.type === "SUBSCRIBED") {
          clearTimeout(timeout);
          ws.close();
          resolve();
        }
      });

      ws.on("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  });
});
