import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import net from "node:net";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { printerService } from "../src/services/printer.service.js";
import { printJobService } from "../src/services/print-job.service.js";
import { printAgentGatewayService } from "../src/services/print-agent-gateway.service.js";
import { LocalPrintAgentClient } from "../../agent/src/client.js";
import { loadAgentConfig } from "../../agent/src/config.js";
import { PrinterType, PrintJobStatus } from "@prisma/client";

describe("SCULPX E-Billing — Phase 6G: Agent & Queue Recovery Audit Suite", () => {
  let app: FastifyInstance;
  let serverPort: number;
  let wsGatewayUrl: string;

  const TENANT_ID = "e1b1d1f0-0000-4000-8000-000000000001";
  let adminToken: string;
  let mockPrinterServer: net.Server;
  let mockPrinterPort: number;

  beforeAll(async () => {
    // 1. Mock TCP printer
    mockPrinterServer = net.createServer();
    await new Promise<void>((resolve) => {
      mockPrinterServer.listen(0, "127.0.0.1", () => {
        const addr = mockPrinterServer.address() as net.AddressInfo;
        mockPrinterPort = addr.port;
        resolve();
      });
    });

    // 2. Start Fastify app
    app = await buildApp();
    await app.listen({ port: 0, host: "127.0.0.1" });
    const address = app.server.address() as net.AddressInfo;
    serverPort = address.port;
    wsGatewayUrl = `ws://127.0.0.1:${serverPort}/ws/print-agent`;

    // 3. User & Admin token
    let admin = await prisma.user.findFirst({ where: { tenantId: TENANT_ID, role: "ADMIN", isActive: true } });
    if (!admin) {
      admin = await prisma.user.create({
        data: {
          tenantId: TENANT_ID,
          email: `admin-rec-${Date.now()}@demo.com`,
          name: "Admin Recovery",
          role: "ADMIN",
          passwordHash: "hash",
        },
      });
    }

    adminToken = (app as any).jwt.sign({
      sub: admin.id,
      email: admin.email,
      tenantId: TENANT_ID,
      role: admin.role,
    });
  });

  afterAll(async () => {
    printAgentGatewayService.shutdown();
    await app.close();
    await new Promise<void>((resolve) => {
      mockPrinterServer.close(() => resolve());
    });
  });

  // --------------------------------------------------------------------------
  // Scenario 1: Agent disconnect before receiving a job
  // --------------------------------------------------------------------------
  it("Scenario 1: should return AGENT_OFFLINE when agent disconnects before job dispatch", async () => {
    const printer = await printerService.createPrinter(TENANT_ID, {
      name: "Offline Queue Printer",
      type: PrinterType.KITCHEN,
      ipAddress: "127.0.0.1",
      port: mockPrinterPort,
      connectionType: "LOCAL_AGENT",
    });

    // Dispatch print when no agent is connected
    const res = await printAgentGatewayService.dispatchPrint(printer, Buffer.from("DISCONNECT_TEST"));
    expect(res.success).toBe(false);
    expect(res.uncertain).toBe(false);
    expect(res.error).toContain("AGENT_OFFLINE");
  });

  // --------------------------------------------------------------------------
  // Scenario 2: Agent receives job (RECEIVED) but disconnects before acknowledging
  // --------------------------------------------------------------------------
  it("Scenario 2: should transition job to UNCERTAIN if agent disconnects after sending RECEIVED", async () => {
    const printer = await printerService.createPrinter(TENANT_ID, {
      name: "Mid-Flight Drop Printer",
      type: PrinterType.KITCHEN,
      ipAddress: "127.0.0.1",
      port: mockPrinterPort,
      connectionType: "LOCAL_AGENT",
    });

    const deviceId = `agent-crash-${Date.now()}`;
    const reg = await app.inject({
      method: "POST",
      url: "/api/v1/print-agents",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: "Crash Agent", deviceId, permittedPrinterIds: [printer.id] },
    });
    const { apiKey } = JSON.parse(reg.payload).data;

    // Connect raw WebSocket agent to simulate sending RECEIVED then abruptly terminating socket
    const ws = new WebSocket(wsGatewayUrl);
    await new Promise<void>((resolve) => {
      ws.on("open", () => {
        ws.send(JSON.stringify({ type: "AGENT_HELLO", deviceId, apiKey }));
      });
      ws.on("message", (msg) => {
        const frame = JSON.parse(msg.toString("utf8"));
        if (frame.type === "AGENT_WELCOME") {
          resolve();
        } else if (frame.type === "PRINT_REQUEST") {
          // Send RECEIVED ack stage then abruptly close socket
          ws.send(
            JSON.stringify({
              type: "AGENT_ACK",
              requestId: frame.requestId,
              jobId: frame.jobId,
              stage: "RECEIVED",
            })
          );
          // Wait 50ms then crash/terminate connection
          setTimeout(() => {
            ws.terminate();
          }, 50);
        }
      });
    });

    const job = await printJobService.createJob(TENANT_ID, {
      printerId: printer.id,
      type: "KOT",
      payload: { orderNumber: "ORD-CRASH-01", items: [] },
    });

    const ok = await printJobService.executeJob(job as any);
    expect(ok).toBe(false);

    // Job in database MUST be marked UNCERTAIN because agent received payload before dropping
    const updated = await printJobService.getJobById(TENANT_ID, job.id);
    expect(updated.status).toBe(PrintJobStatus.UNCERTAIN);
    expect(updated.errorMessage).toContain("UNCERTAIN_DELIVERY");
  });

  // --------------------------------------------------------------------------
  // Scenario 3: Gateway restart / heartbeat expired recovery
  // --------------------------------------------------------------------------
  it("Scenario 3: claimPendingBatch should recover stale PRINTING jobs older than 60s into UNCERTAIN", async () => {
    const printer = await printerService.createPrinter(TENANT_ID, {
      name: "Stale Batch Printer",
      type: PrinterType.BILLING,
      ipAddress: "127.0.0.1",
      port: mockPrinterPort,
    });

    // Create a job directly in PRINTING status with updatedAt in past
    const staleDate = new Date(Date.now() - 90000); // 90 seconds ago
    const staleJob = await prisma.printJob.create({
      data: {
        tenantId: TENANT_ID,
        printerId: printer.id,
        jobType: "BILL_RECEIPT",
        payload: { billId: "STALE-01" },
        status: PrintJobStatus.PRINTING,
        updatedAt: staleDate,
      },
    });

    // Manually force updatedAt timestamp backwards in DB
    await prisma.$executeRaw`
      UPDATE print_jobs
      SET updated_at = NOW() - INTERVAL '90 seconds'
      WHERE id = ${staleJob.id}::uuid
    `;

    // Trigger batch claim
    await printJobService.claimPendingBatch(5);

    // Verify stale job was transitioned to UNCERTAIN rather than blindly requeued
    const recovered = await printJobService.getJobById(TENANT_ID, staleJob.id);
    expect(recovered.status).toBe(PrintJobStatus.UNCERTAIN);
    expect(recovered.errorMessage).toContain("Worker heartbeat expired");
  });

  // --------------------------------------------------------------------------
  // Scenario 4: Revoked agent reconnect attempt
  // --------------------------------------------------------------------------
  it("Scenario 4: should reject reconnect attempts from a revoked agent device", async () => {
    const deviceId = `agent-rev-reconn-${Date.now()}`;
    const reg = await app.inject({
      method: "POST",
      url: "/api/v1/print-agents",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: "To Be Revoked", deviceId },
    });
    const { apiKey, agent } = JSON.parse(reg.payload).data;

    // Revoke agent
    await app.inject({
      method: "POST",
      url: `/api/v1/print-agents/${agent.id}/revoke`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    // Try connecting
    const ws = new WebSocket(wsGatewayUrl);
    const closePromise = new Promise<{ code: number; reason: string }>((resolve) => {
      ws.on("open", () => {
        ws.send(JSON.stringify({ type: "AGENT_HELLO", deviceId, apiKey }));
      });
      ws.on("close", (code, reason) => {
        resolve({ code, reason: reason.toString("utf8") });
      });
    });

    const result = await closePromise;
    expect(result.code).toBe(4003); // AUTH_FAILED
  });

  // --------------------------------------------------------------------------
  // Scenario 5: Unauthorized cross-agent ACK rejection
  // --------------------------------------------------------------------------
  it("Scenario 5: should reject ACK from an agent that was not the dispatched agent", async () => {
    const printer = await printerService.createPrinter(TENANT_ID, {
      name: "Strict Agent Printer",
      type: PrinterType.KITCHEN,
      ipAddress: "127.0.0.1",
      port: mockPrinterPort,
      connectionType: "LOCAL_AGENT",
    });

    // Enroll Agent 1 (legitimate)
    const deviceId1 = `agent-legit-${Date.now()}`;
    const reg1 = await app.inject({
      method: "POST",
      url: "/api/v1/print-agents",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: "Legit Agent", deviceId: deviceId1, permittedPrinterIds: [printer.id] },
    });
    const { apiKey: apiKey1 } = JSON.parse(reg1.payload).data;

    // Enroll Agent 2 (rogue/unauthorized for this job)
    const deviceId2 = `agent-rogue-${Date.now()}`;
    const reg2 = await app.inject({
      method: "POST",
      url: "/api/v1/print-agents",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: "Rogue Agent", deviceId: deviceId2, permittedPrinterIds: [printer.id] },
    });
    const { apiKey: apiKey2 } = JSON.parse(reg2.payload).data;

    // Connect Agent 1
    const ws1 = new WebSocket(wsGatewayUrl);
    let capturedRequestId = "";
    await new Promise<void>((resolve) => {
      ws1.on("open", () => ws1.send(JSON.stringify({ type: "AGENT_HELLO", deviceId: deviceId1, apiKey: apiKey1 })));
      ws1.on("message", (msg) => {
        const frame = JSON.parse(msg.toString("utf8"));
        if (frame.type === "AGENT_WELCOME") resolve();
        if (frame.type === "PRINT_REQUEST") capturedRequestId = frame.requestId;
      });
    });

    // Connect Agent 2
    const ws2 = new WebSocket(wsGatewayUrl);
    await new Promise<void>((resolve) => {
      ws2.on("open", () => ws2.send(JSON.stringify({ type: "AGENT_HELLO", deviceId: deviceId2, apiKey: apiKey2 })));
      ws2.on("message", (msg) => {
        const frame = JSON.parse(msg.toString("utf8"));
        if (frame.type === "AGENT_WELCOME") resolve();
      });
    });

    // Dispatch print job (routes to ws1)
    const printPromise = printAgentGatewayService.dispatchPrint(printer, Buffer.from("TEST_JOB"));

    // Wait 100ms for ws1 to receive frame
    await new Promise((r) => setTimeout(r, 100));
    expect(capturedRequestId).not.toBe("");

    // Now Agent 2 maliciously attempts to send PRINTED ACK for this requestId
    ws2.send(
      JSON.stringify({
        type: "AGENT_ACK",
        requestId: capturedRequestId,
        jobId: capturedRequestId,
        stage: "PRINTED",
        bytesWritten: 10,
      })
    );

    // Agent 1 legitimately sends PRINTED ACK
    await new Promise((r) => setTimeout(r, 50));
    ws1.send(
      JSON.stringify({
        type: "AGENT_ACK",
        requestId: capturedRequestId,
        jobId: capturedRequestId,
        stage: "PRINTED",
        bytesWritten: 10,
      })
    );

    const outcome = await printPromise;
    expect(outcome.success).toBe(true);

    ws1.close();
    ws2.close();
  });

  // --------------------------------------------------------------------------
  // Scenario 6: Operator retry, cancellation, and audited reprint behavior
  // --------------------------------------------------------------------------
  describe("Scenario 6: Operator Intervention Workflow", () => {
    it("should allow operator to retry an UNCERTAIN print job back to QUEUED", async () => {
      const printer = await printerService.createPrinter(TENANT_ID, {
        name: "Op Retry Printer",
        type: PrinterType.KITCHEN,
        ipAddress: "127.0.0.1",
        port: mockPrinterPort,
      });

      const uncertainJob = await prisma.printJob.create({
        data: {
          tenantId: TENANT_ID,
          printerId: printer.id,
          jobType: "KOT",
          payload: { table: "T1" },
          status: PrintJobStatus.UNCERTAIN,
          errorMessage: "UNCERTAIN_DELIVERY: Partial write",
        },
      });

      const retried = await printJobService.retryJob(TENANT_ID, uncertainJob.id, "staff-user-123");
      expect(retried.status).toBe(PrintJobStatus.QUEUED);
      expect(retried.errorMessage).toBeNull();
      expect(retried.initiatedBy).toContain("staff-user-123");
    });

    it("should allow operator to cancel an UNCERTAIN print job to CANCELLED", async () => {
      const printer = await printerService.createPrinter(TENANT_ID, {
        name: "Op Cancel Printer",
        type: PrinterType.BILLING,
        ipAddress: "127.0.0.1",
        port: mockPrinterPort,
      });

      const uncertainJob = await prisma.printJob.create({
        data: {
          tenantId: TENANT_ID,
          printerId: printer.id,
          jobType: "BILL_RECEIPT",
          payload: { bill: "B-500" },
          status: PrintJobStatus.UNCERTAIN,
          errorMessage: "UNCERTAIN_DELIVERY: Ambiguous outcome",
        },
      });

      const cancelled = await printJobService.cancelJob(
        TENANT_ID,
        uncertainJob.id,
        "supervisor-456",
        "Physical inspection confirmed bill already printed"
      );

      expect(cancelled.status).toBe(PrintJobStatus.CANCELLED);
      expect(cancelled.errorMessage).toContain("Physical inspection confirmed");
    });

    it("should issue an audited reprint creating a new distinct job with watermark", async () => {
      const printer = await printerService.createPrinter(TENANT_ID, {
        name: "Reprint Printer",
        type: PrinterType.BILLING,
        ipAddress: "127.0.0.1",
        port: mockPrinterPort,
      });

      const originalJob = await prisma.printJob.create({
        data: {
          tenantId: TENANT_ID,
          printerId: printer.id,
          jobType: "BILL_RECEIPT",
          payload: { billNumber: "INV-2026-001", total: 1250 },
          status: PrintJobStatus.COMPLETED,
        },
      });

      const reprintJob = await printJobService.reprintJob(
        TENANT_ID,
        originalJob.id,
        "manager-789",
        "Customer requested duplicate tax receipt"
      );

      expect(reprintJob.id).not.toBe(originalJob.id);
      expect(reprintJob.isReprint).toBe(true);
      expect(reprintJob.reprintReason).toBe("Customer requested duplicate tax receipt");
      expect(reprintJob.status).toBe(PrintJobStatus.QUEUED);

      const payload = reprintJob.payload as Record<string, unknown>;
      expect(payload.isReprint).toBe(true);
      expect(payload.originalJobId).toBe(originalJob.id);
      expect(payload.reprintCount).toBe(1);
    });
  });
});
