import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { printerService } from "../src/services/printer.service.js";
import { printJobService } from "../src/services/print-job.service.js";
import { printWorkerService } from "../src/services/print-worker.service.js";
import { MockPrinterAdapter } from "../src/services/printer-adapters/mock.adapter.ts";
import { PrinterRenderer } from "../src/services/printer-renderer.js";
import { PrinterType, PrintJobStatus } from "@prisma/client";

describe("SCULPX E-Billing — Phase 6: Hardware Printing & Print Queue Suite", () => {
  let app: FastifyInstance;
  let mockAdapter: MockPrinterAdapter;

  const TENANT_A = "e1b1d1f0-0000-4000-8000-000000000001"; // Standard demo tenant
  const TENANT_B = "e2b2d2f0-0000-4000-8000-000000000002"; // Isolated second tenant

  let adminTokenA: string;
  let managerTokenA: string;
  let cashierTokenA: string;
  let waiterTokenA: string;
  let adminTokenB: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // Attach mock adapter for predictable hardware testing
    mockAdapter = new MockPrinterAdapter();
    printerService.setAdapter(mockAdapter);

    // Find or create Tenant A Admin
    let adminA = await prisma.user.findFirst({ where: { tenantId: TENANT_A, role: "ADMIN" } });
    if (!adminA) {
      adminA = await prisma.user.create({
        data: {
          tenantId: TENANT_A,
          email: `admin-p6-${Date.now()}@demo.com`,
          name: "Phase 6 Admin A",
          role: "ADMIN",
          passwordHash: "hash",
        },
      });
    }

    // Find or create Tenant A Manager
    let managerA = await prisma.user.findFirst({ where: { tenantId: TENANT_A, role: "MANAGER" } });
    if (!managerA) {
      managerA = await prisma.user.create({
        data: {
          tenantId: TENANT_A,
          email: `manager-p6-${Date.now()}@demo.com`,
          name: "Phase 6 Manager A",
          role: "MANAGER",
          passwordHash: "hash",
        },
      });
    }

    // Find or create Tenant A Cashier
    let cashierA = await prisma.user.findFirst({ where: { tenantId: TENANT_A, role: "CASHIER" } });
    if (!cashierA) {
      cashierA = await prisma.user.create({
        data: {
          tenantId: TENANT_A,
          email: `cashier-p6-${Date.now()}@demo.com`,
          name: "Phase 6 Cashier A",
          role: "CASHIER",
          passwordHash: "hash",
        },
      });
    }

    // Find or create Tenant A Waiter
    let waiterA = await prisma.user.findFirst({ where: { tenantId: TENANT_A, role: "WAITER" } });
    if (!waiterA) {
      waiterA = await prisma.user.create({
        data: {
          tenantId: TENANT_A,
          email: `waiter-p6-${Date.now()}@demo.com`,
          name: "Phase 6 Waiter A",
          role: "WAITER",
          passwordHash: "hash",
        },
      });
    }

    // Find or create Tenant B Admin
    let adminB = await prisma.user.findFirst({ where: { tenantId: TENANT_B, role: "ADMIN" } });
    if (!adminB) {
      adminB = await prisma.user.create({
        data: {
          tenantId: TENANT_B,
          email: `admin-b-p6-${Date.now()}@foreign.com`,
          name: "Phase 6 Admin B",
          role: "ADMIN",
          passwordHash: "hash",
        },
      });
    }

    // Setup auth tokens
    adminTokenA = app.jwt.sign({
      sub: adminA.id,
      email: adminA.email,
      role: adminA.role,
      tenantId: TENANT_A,
    });

    managerTokenA = app.jwt.sign({
      sub: managerA.id,
      email: managerA.email,
      role: managerA.role,
      tenantId: TENANT_A,
    });

    cashierTokenA = app.jwt.sign({
      sub: cashierA.id,
      email: cashierA.email,
      role: cashierA.role,
      tenantId: TENANT_A,
    });

    waiterTokenA = app.jwt.sign({
      sub: waiterA.id,
      email: waiterA.email,
      role: waiterA.role,
      tenantId: TENANT_A,
    });

    adminTokenB = app.jwt.sign({
      sub: adminB.id,
      email: adminB.email,
      role: adminB.role,
      tenantId: TENANT_B,
    });
  });

  afterAll(async () => {
    printWorkerService.stopBackgroundWorker();
    await app.close();
  });

  beforeEach(async () => {
    mockAdapter.clearHistory();
  });

  // =========================================================================
  // PART A: Printer Registry & Tenant Isolation
  // =========================================================================
  describe("Phase 6A: Printer Registry, Routing & Multi-Tenant Isolation", () => {
    it("should allow ADMIN to register a new thermal network printer", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/printers",
        headers: { Authorization: `Bearer ${adminTokenA}` },
        payload: {
          name: "Kitchen Line Thermal",
          type: "KITCHEN",
          ipAddress: "192.168.1.201",
          port: 9100,
          station: "Hot Kitchen",
          location: "Ground Floor Hot Line",
          paperWidthMm: 80,
          isDefault: true,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.success).toBe(true);
      expect(body.data.name).toBe("Kitchen Line Thermal");
      expect(body.data.station).toBe("Hot Kitchen");
      expect(body.data.isDefault).toBe(true);
      expect(body.data.tenantId).toBe(TENANT_A);
    });

    it("should reject unauthorized roles (WAITER) from creating printers with HTTP 403", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/printers",
        headers: { Authorization: `Bearer ${waiterTokenA}` },
        payload: {
          name: "Hacked Printer",
          type: "KITCHEN",
          ipAddress: "10.0.0.1",
        },
      });

      expect(res.statusCode).toBe(403);
    });

    it("should enforce strict multi-tenant boundary: Tenant B cannot access Tenant A printers", async () => {
      // 1. Create a printer in Tenant A
      const printerA = await prisma.printer.create({
        data: {
          tenantId: TENANT_A,
          name: "Secret Tenant A Printer",
          type: PrinterType.BILLING,
          ipAddress: "192.168.10.50",
          station: "Cashier Desk A",
        },
      });

      // 2. Tenant B attempts to access it
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/printers/${printerA.id}`,
        headers: { Authorization: `Bearer ${adminTokenB}` },
      });

      expect(res.statusCode).toBe(404);

      // 3. Tenant B lists printers: must not include Tenant A printers
      const listRes = await app.inject({
        method: "GET",
        url: "/api/v1/printers",
        headers: { Authorization: `Bearer ${adminTokenB}` },
      });

      expect(listRes.statusCode).toBe(200);
      const listBody = JSON.parse(listRes.body);
      const foundA = listBody.data.some((p: any) => p.id === printerA.id);
      expect(foundA).toBe(false);
    });

    it("should update printer configuration and toggle enable/disable", async () => {
      const printer = await prisma.printer.create({
        data: {
          tenantId: TENANT_A,
          name: "Bar Counter Printer",
          type: PrinterType.BAR,
          ipAddress: "192.168.1.205",
          isActive: true,
        },
      });

      const updateRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/printers/${printer.id}`,
        headers: { Authorization: `Bearer ${adminTokenA}` },
        payload: {
          location: "Rooftop Lounge Bar",
          paperWidthMm: 58,
          isActive: false,
        },
      });

      expect(updateRes.statusCode).toBe(200);
      const body = JSON.parse(updateRes.body);
      expect(body.data.location).toBe("Rooftop Lounge Bar");
      expect(body.data.paperWidthMm).toBe(58);
      expect(body.data.isActive).toBe(false);
    });

    it("should accurately route documents to station and default printers", async () => {
      await prisma.printer.create({
        data: {
          tenantId: TENANT_A,
          name: "Tandoor Station Printer",
          type: PrinterType.KITCHEN,
          ipAddress: "192.168.1.210",
          station: "Tandoor",
          isActive: true,
        },
      });

      // Station specific route
      const tandoorPrinter = await printerService.routePrinter(TENANT_A, "KOT", "Tandoor");
      expect(tandoorPrinter).toBeDefined();
      expect(tandoorPrinter?.station).toBe("Tandoor");

      // Generic Billing route
      const billingPrinter = await printerService.routePrinter(TENANT_A, "BILL_RECEIPT");
      expect(billingPrinter).toBeDefined();
    });

    it("should provide operational summary for fleet and print queue", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/printers/summary",
        headers: { Authorization: `Bearer ${adminTokenA}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.fleet).toBeDefined();
      expect(typeof body.data.fleet.total).toBe("number");
      expect(typeof body.data.queue.pending).toBe("number");
    });
  });

  // =========================================================================
  // PART B: Durable Print Jobs, Deduplication & Worker Concurrency
  // =========================================================================
  describe("Phase 6B: Durable Print Jobs, Idempotency & Concurrency Worker", () => {
    let testPrinter: any;

    beforeEach(async () => {
      testPrinter = await prisma.printer.create({
        data: {
          tenantId: TENANT_A,
          name: "Fast Kitchen Spooler",
          type: PrinterType.KITCHEN,
          ipAddress: "192.168.1.220",
          port: 9100,
          isActive: true,
          isOnline: true,
        },
      });
    });

    it("should queue a print job and suppress duplicate submission via idempotencyKey", async () => {
      const idempotencyKey = `job-test-${Date.now()}`;

      const res1 = await app.inject({
        method: "POST",
        url: "/api/v1/print-jobs",
        headers: { Authorization: `Bearer ${adminTokenA}` },
        payload: {
          printerId: testPrinter.id,
          type: "KOT",
          referenceId: "KOT-101",
          idempotencyKey,
          payload: { kotNumber: "KOT-101", items: [{ name: "Paneer Tikka", quantity: 2 }] },
        },
      });

      expect(res1.statusCode).toBe(201);
      const job1 = JSON.parse(res1.body).data;

      // Duplicate submission with same key
      const res2 = await app.inject({
        method: "POST",
        url: "/api/v1/print-jobs",
        headers: { Authorization: `Bearer ${adminTokenA}` },
        payload: {
          printerId: testPrinter.id,
          type: "KOT",
          referenceId: "KOT-101",
          idempotencyKey,
          payload: { kotNumber: "KOT-101", items: [{ name: "Paneer Tikka", quantity: 2 }] },
        },
      });

      expect(res2.statusCode).toBe(201);
      const job2 = JSON.parse(res2.body).data;
      expect(job2.id).toBe(job1.id); // Same job returned, not duplicated
    });

    it("should atomically claim pending batch without race condition across concurrent workers", async () => {
      // Create 3 queued jobs
      const job1 = await printJobService.createJob(TENANT_A, {
        printerId: testPrinter.id,
        type: "KOT",
        payload: { kotNumber: "KOT-A1", items: [] },
      });
      const job2 = await printJobService.createJob(TENANT_A, {
        printerId: testPrinter.id,
        type: "KOT",
        payload: { kotNumber: "KOT-A2", items: [] },
      });

      // Simulate two background workers claiming concurrently
      const [claimWorker1, claimWorker2] = await Promise.all([
        printJobService.claimPendingBatch(5),
        printJobService.claimPendingBatch(5),
      ]);

      const ids1 = new Set(claimWorker1.map((j) => j.id));
      const ids2 = new Set(claimWorker2.map((j) => j.id));

      // Overlap must be empty: no single job claimed by both workers!
      const overlap = [...ids1].filter((id) => ids2.has(id));
      expect(overlap.length).toBe(0);
    });

    it("should successfully execute a job through adapter and mark COMPLETED", async () => {
      const job = await printJobService.createJob(TENANT_A, {
        printerId: testPrinter.id,
        type: "KOT",
        payload: {
          kotNumber: "KOT-999",
          tableOrRoom: "Table 12",
          createdAt: new Date().toISOString(),
          items: [{ name: "Butter Chicken", quantity: 1 }],
        },
      });

      // Claim job
      await prisma.printJob.update({
        where: { id: job.id },
        data: { status: PrintJobStatus.PRINTING },
      });

      const fullJob = await printJobService.getJobById(TENANT_A, job.id);
      const success = await printJobService.executeJob(fullJob);

      expect(success).toBe(true);

      const after = await prisma.printJob.findUnique({ where: { id: job.id } });
      expect(after?.status).toBe(PrintJobStatus.COMPLETED);
      expect(after?.completedAt).toBeDefined();

      // Verify mock adapter received the raw payload
      const history = mockAdapter.getPrintHistory(testPrinter.id);
      expect(history.length).toBeGreaterThan(0);
    });

    it("should implement bounded retries and transition to FAILED on persistent errors", async () => {
      mockAdapter.clearHistory();
      mockAdapter.setSimulatedFailure(testPrinter.id, "Connection refused: TCP port closed");

      const job = await printJobService.createJob(TENANT_A, {
        printerId: testPrinter.id,
        type: "KOT",
        maxRetries: 2,
        payload: { kotNumber: "KOT-FAIL-1", tableOrRoom: "Table 4", items: [] },
      });

      const fullJob = await printJobService.getJobById(TENANT_A, job.id);

      // Attempt 1: Should retry (status -> QUEUED, retryCount -> 1)
      await printJobService.executeJob(fullJob);
      const after1 = await prisma.printJob.findUnique({ where: { id: job.id } });
      expect(after1?.status).toBe(PrintJobStatus.QUEUED);
      expect(after1?.retryCount).toBe(1);

      // Attempt 2: Reaches maxRetries (2) -> transitions permanently to FAILED
      const fullJobAttempt2 = await printJobService.getJobById(TENANT_A, job.id);
      await printJobService.executeJob(fullJobAttempt2);
      const after2 = await prisma.printJob.findUnique({ where: { id: job.id } });
      expect(after2?.status).toBe(PrintJobStatus.FAILED);
      expect(after2?.errorMessage).toContain("Connection refused");

      mockAdapter.clearHistory();
    });

    it("should handle ambiguous/uncertain hardware outcomes explicitly without blind auto-retries", async () => {
      mockAdapter.clearHistory();
      mockAdapter.setSimulatedUncertain(testPrinter.id, true);

      const job = await printJobService.createJob(TENANT_A, {
        printerId: testPrinter.id,
        type: "BILL_RECEIPT",
        payload: {
          invoiceNumber: "INV-UNCERTAIN-1",
          tableOrRoom: "Table 4",
          subtotal: 100,
          grandTotal: 105,
          paymentStatus: "PAID",
          taxBreakdown: [],
          items: [],
        },
      });

      const fullJob = await printJobService.getJobById(TENANT_A, job.id);
      const outcome = await printJobService.executeJob(fullJob);

      expect(outcome).toBe(false);

      const after = await prisma.printJob.findUnique({ where: { id: job.id } });
      expect(after?.status).toBe(PrintJobStatus.UNCERTAIN);
      expect(after?.errorMessage).toContain("UNCERTAIN_DELIVERY");

      // Verify worker will NOT claim UNCERTAIN jobs automatically
      const claimed = await printJobService.claimPendingBatch(10);
      const hasUncertainClaimed = claimed.some((j) => j.id === job.id);
      expect(hasUncertainClaimed).toBe(false);

      mockAdapter.clearHistory();
    });

    it("should allow authorized manual retry for FAILED or UNCERTAIN jobs", async () => {
      const failedJob = await prisma.printJob.create({
        data: {
          tenantId: TENANT_A,
          printerId: testPrinter.id,
          jobType: "BILL_RECEIPT",
          payload: { invoiceNumber: "INV-RETRY" },
          status: PrintJobStatus.FAILED,
          errorMessage: "Simulated paper jam",
        },
      });

      const res = await app.inject({
        method: "POST",
        url: `/api/v1/print-jobs/${failedJob.id}/retry`,
        headers: { Authorization: `Bearer ${adminTokenA}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data.status).toBe(PrintJobStatus.QUEUED);
      expect(body.data.errorMessage).toBeNull();
    });

    it("should recover abandoned PRINTING jobs older than 60s as UNCERTAIN without blind auto-requeuing", async () => {
      // Create a stale PRINTING job with updatedAt set to 70 seconds ago
      const staleTime = new Date(Date.now() - 70000);
      const staleJob = await prisma.printJob.create({
        data: {
          tenantId: TENANT_A,
          printerId: testPrinter.id,
          jobType: "KOT",
          payload: { kotNumber: "KOT-STALE-1", tableOrRoom: "Table 8", items: [] },
          status: PrintJobStatus.PRINTING,
          updatedAt: staleTime,
        },
      });

      // Run batch claim sweep
      await printJobService.claimPendingBatch(10);

      const recovered = await prisma.printJob.findUnique({ where: { id: staleJob.id } });
      expect(recovered?.status).toBe(PrintJobStatus.UNCERTAIN);
      expect(recovered?.errorMessage).toContain("Worker heartbeat expired");

      // Verify authorized staff can cancel/dismiss this UNCERTAIN job
      const cancelRes = await app.inject({
        method: "POST",
        url: `/api/v1/print-jobs/${staleJob.id}/cancel`,
        headers: { Authorization: `Bearer ${adminTokenA}` },
        payload: { reason: "Confirmed ticket had already printed on physical machine" },
      });

      expect(cancelRes.statusCode).toBe(200);
      const cancelledBody = JSON.parse(cancelRes.body);
      expect(cancelledBody.data.status).toBe(PrintJobStatus.CANCELLED);
    });

    it("should generate authorized duplicate reprint copies with visible watermark", async () => {
      const originalJob = await prisma.printJob.create({
        data: {
          tenantId: TENANT_A,
          printerId: testPrinter.id,
          jobType: "KOT",
          referenceId: "KOT-555",
          payload: { kotNumber: "KOT-555", tableOrRoom: "Table 04", items: [{ name: "Biryani", quantity: 1 }] },
          status: PrintJobStatus.COMPLETED,
        },
      });

      const reprintRes = await app.inject({
        method: "POST",
        url: `/api/v1/print-jobs/${originalJob.id}/reprint`,
        headers: { Authorization: `Bearer ${cashierTokenA}` },
        payload: { reason: "Guest lost original ticket copy" },
      });

      expect(reprintRes.statusCode).toBe(201);
      const reprintData = JSON.parse(reprintRes.body).data;

      expect(reprintData.id).not.toBe(originalJob.id);
      expect(reprintData.isReprint).toBe(true);
      expect(reprintData.reprintReason).toBe("Guest lost original ticket copy");
      expect(reprintData.status).toBe(PrintJobStatus.QUEUED);

      // Verify plain text renderer injects the duplicate watermark
      const plainText = PrinterRenderer.renderKotPlainText(reprintData.payload, { isReprint: true });
      expect(plainText).toContain("*** DUPLICATE / REPRINT COPY ***");
      expect(plainText).toContain("Reason: Guest lost original ticket copy");
    });
  });

  // =========================================================================
  // PART C: Print Document Rendering Invariants
  // =========================================================================
  describe("Phase 6C: Authoritative Document Rendering Invariants", () => {
    it("should render KOT preserving item quantities, modifiers, and special instructions", () => {
      const kotText = PrinterRenderer.renderKotPlainText({
        kotNumber: "KOT-20261011-0042",
        orderNumber: "ORD-20261011-0042",
        station: "Tandoor",
        tableOrRoom: "Table 07",
        serverName: "Karan Captain",
        createdAt: "11-Oct-2026 19:30:00",
        items: [
          {
            name: "Butter Naan",
            quantity: 4,
            modifiers: ["Crispy", "Extra Butter"],
            specialInstructions: "Cut into 4 pieces each",
          },
          {
            name: "Tandoori Chicken Full",
            quantity: 1,
            specialInstructions: "Make it spicy",
          },
        ],
        notes: "Rush order for VIP guests",
      });

      expect(kotText).toContain("KOT: #KOT-20261011-0042");
      expect(kotText).toContain("STATION: TANDOOR");
      expect(kotText).toContain("Table 07");
      expect(kotText).toContain("4x Butter Naan");
      expect(kotText).toContain("+ Crispy");
      expect(kotText).toContain("[NOTE: Cut into 4 pieces each]");
      expect(kotText).toContain("Total Items: 2");
      expect(kotText).toContain("Rush order for VIP guests");
    });

    it("should render Customer Tax Receipt preserving historical GST, service charge, and payment mode", () => {
      const receiptText = PrinterRenderer.renderReceiptPlainText({
        propertyHeader: {
          name: "SCULPX GRAND HOTEL",
          address: "Connaught Place, New Delhi",
          phone: "+91 11 2345 6789",
          gstin: "07AAAAA0000A1Z5",
        },
        invoiceNumber: "INV-20261011-0089",
        orderNumber: "ORD-20261011-0089",
        tableOrRoom: "Table 05",
        billedBy: "Pooja Verma",
        issuedAt: "11-Oct-2026 20:15:30",
        items: [
          { name: "Dal Makhani", quantity: 2, unitPrice: 350, totalPrice: 700 },
          { name: "Jeera Rice", quantity: 1, unitPrice: 200, totalPrice: 200 },
        ],
        subtotal: 900,
        discountAmount: 90,
        discountReason: "Corporate 10%",
        serviceChargeAmount: 40.5,
        taxBreakdown: [
          { label: "CGST", ratePercent: 2.5, amount: 21.26 },
          { label: "SGST", ratePercent: 2.5, amount: 21.26 },
        ],
        roundOff: 0.98,
        grandTotal: 894,
        payments: [
          { method: "UPI", amount: 500, reference: "UPI/REF/9981" },
          { method: "CASH", amount: 394 },
        ],
        paymentStatus: "PAID",
      });

      expect(receiptText).toContain("SCULPX GRAND HOTEL");
      expect(receiptText).toContain("GSTIN: 07AAAAA0000A1Z5");
      expect(receiptText).toContain("Tax Invoice: #INV-20261011-0089");
      expect(receiptText).toContain("Dal Makhani");
      expect(receiptText).toContain("Subtotal:");
      expect(receiptText).toContain("Discount (Corporate 10%):");
      expect(receiptText).toContain("Service Charge (5%):");
      expect(receiptText).toContain("CGST (2.5%):");
      expect(receiptText).toContain("SGST (2.5%):");
      expect(receiptText).toContain("GRAND TOTAL:");
      expect(receiptText).toContain("₹894.00");
      expect(receiptText).toContain("UPI:");
      expect(receiptText).toContain("CASH:");
    });

    it("should produce valid ESC/POS byte buffers with initialization and cut commands", () => {
      const escPosBuffer = PrinterRenderer.renderEscPos("KOT", {
        kotNumber: "KOT-ESC-1",
        tableOrRoom: "Table 01",
        createdAt: "2026-10-11",
        items: [{ name: "Tea", quantity: 1 }],
      });

      expect(Buffer.isBuffer(escPosBuffer)).toBe(true);
      expect(escPosBuffer.length).toBeGreaterThan(10);
      // Verify ESC @ (0x1b, 0x40) init header
      expect(escPosBuffer[0]).toBe(0x1b);
      expect(escPosBuffer[1]).toBe(0x40);
      // Verify cut command is present
      const hasCut = escPosBuffer.includes(Buffer.from([0x1d, 0x56]));
      expect(hasCut).toBe(true);
    });
  });
});
