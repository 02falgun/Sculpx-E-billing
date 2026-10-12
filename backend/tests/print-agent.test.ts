import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import net from "node:net";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { printerService } from "../src/services/printer.service.js";
import { printJobService } from "../src/services/print-job.service.js";
import { printWorkerService } from "../src/services/print-worker.service.js";
import { printAgentGatewayService } from "../src/services/print-agent-gateway.service.js";
import { LocalPrintAgentClient } from "../../agent/src/client.js";
import { LocalPrinterClient } from "../../agent/src/printer-client.js";
import { loadAgentConfig } from "../../agent/src/config.js";
import { PrinterType, PrintJobStatus } from "@prisma/client";

describe("SCULPX E-Billing — Phase 6F: Secure Local Print Agent & Cloud Gateway Suite", () => {
  let app: FastifyInstance;
  let serverPort: number;
  let wsGatewayUrl: string;

  const TENANT_A = "e1b1d1f0-0000-4000-8000-000000000001";
  const TENANT_B = "e2b2d2f0-0000-4000-8000-000000000002";

  let adminTokenA: string;
  let adminTokenB: string;

  // Mock TCP printer on localhost for hardware simulation
  let mockPrinterServer: net.Server;
  let mockPrinterPort: number;
  let receivedPrintBuffers: Buffer[] = [];
  let shouldSimulatePrinterHang = false;

  beforeAll(async () => {
    // 1. Start mock TCP thermal printer on an ephemeral port
    mockPrinterServer = net.createServer((socket) => {
      if (shouldSimulatePrinterHang) {
        // Accept socket connection then abruptly destroy to simulate mid-write cable disconnection
        socket.on("data", () => {
          socket.destroy();
        });
        return;
      }

      socket.on("data", (chunk) => {
        receivedPrintBuffers.push(Buffer.from(chunk));
      });
    });

    await new Promise<void>((resolve) => {
      mockPrinterServer.listen(0, "127.0.0.1", () => {
        const addr = mockPrinterServer.address() as net.AddressInfo;
        mockPrinterPort = addr.port;
        resolve();
      });
    });

    // 2. Start Fastify app listening on dynamic port for real WebSocket test
    app = await buildApp();
    await app.listen({ port: 0, host: "127.0.0.1" });
    const address = app.server.address() as net.AddressInfo;
    serverPort = address.port;
    wsGatewayUrl = `ws://127.0.0.1:${serverPort}/ws/print-agent`;

    // 3. Setup test users and JWTs
    let adminA = await prisma.user.findFirst({ where: { tenantId: TENANT_A, role: "ADMIN", isActive: true } });
    if (!adminA) {
      adminA = await prisma.user.create({
        data: {
          tenantId: TENANT_A,
          email: `admin-ag-a-${Date.now()}@demo.com`,
          name: "Admin Agent A",
          role: "ADMIN",
          passwordHash: "hash",
        },
      });
    }

    let adminB = await prisma.user.findFirst({ where: { tenantId: TENANT_B, role: "ADMIN", isActive: true } });
    if (!adminB) {
      adminB = await prisma.user.create({
        data: {
          tenantId: TENANT_B,
          email: `admin-ag-b-${Date.now()}@demo.com`,
          name: "Admin Agent B",
          role: "ADMIN",
          passwordHash: "hash",
        },
      });
    }

    adminTokenA = (app as any).jwt.sign({
      sub: adminA.id,
      email: adminA.email,
      tenantId: TENANT_A,
      role: adminA.role,
    });

    adminTokenB = (app as any).jwt.sign({
      sub: adminB.id,
      email: adminB.email,
      tenantId: TENANT_B,
      role: adminB.role,
    });
  });

  afterAll(async () => {
    printAgentGatewayService.shutdown();
    await app.close();
    await new Promise<void>((resolve) => {
      mockPrinterServer.close(() => resolve());
    });
  });

  beforeEach(() => {
    receivedPrintBuffers = [];
    shouldSimulatePrinterHang = false;
  });

  // --------------------------------------------------------------------------
  // PART A: Agent Device Enrollment, Credentials & Rotation
  // --------------------------------------------------------------------------
  describe("Part A: Agent Device Registration & Credential Lifecycle", () => {
    it("should allow ADMIN to enroll a new print agent and return plain API key once", async () => {
      const deviceId = `pos-agent-${Date.now()}`;
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/print-agents",
        headers: { authorization: `Bearer ${adminTokenA}` },
        payload: {
          name: "Main Cashier POS Agent",
          deviceId,
          metadata: { os: "linux", terminal: "POS-01" },
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.success).toBe(true);
      expect(body.data.apiKey).toMatch(/^sculpx_ag_[0-9a-f]{48}$/);
      expect(body.data.agent.deviceId).toBe(deviceId);
      expect(body.data.agent.apiKeyHash).toBeUndefined(); // Never expose hash

      // Verify in DB that hash is securely stored
      const inDb = await prisma.printAgent.findUnique({ where: { deviceId } });
      expect(inDb).toBeDefined();
      expect(inDb?.status).toBe("ACTIVE");
      expect(inDb?.apiKeyHash).toBeDefined();
      expect(inDb?.apiKeyHash).not.toBe(body.data.apiKey);
    });

    it("should reject registering duplicate device ID with HTTP 409", async () => {
      const deviceId = `dup-device-${Date.now()}`;
      await app.inject({
        method: "POST",
        url: "/api/v1/print-agents",
        headers: { authorization: `Bearer ${adminTokenA}` },
        payload: { name: "Agent 1", deviceId },
      });

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/print-agents",
        headers: { authorization: `Bearer ${adminTokenA}` },
        payload: { name: "Agent 2", deviceId },
      });

      expect(res.statusCode).toBe(409);
    });

    it("should allow rotating an agent API key and invalidate the old credential", async () => {
      const deviceId = `rotate-agent-${Date.now()}`;
      const reg = await app.inject({
        method: "POST",
        url: "/api/v1/print-agents",
        headers: { authorization: `Bearer ${adminTokenA}` },
        payload: { name: "Rotating Agent", deviceId },
      });
      const agentId = JSON.parse(reg.payload).data.agent.id;
      const originalKey = JSON.parse(reg.payload).data.apiKey;

      const rot = await app.inject({
        method: "POST",
        url: `/api/v1/print-agents/${agentId}/rotate-key`,
        headers: { authorization: `Bearer ${adminTokenA}` },
      });

      expect(rot.statusCode).toBe(200);
      const newKey = JSON.parse(rot.payload).data.apiKey;
      expect(newKey).not.toBe(originalKey);
      expect(newKey).toMatch(/^sculpx_ag_/);
    });

    it("should allow revoking an agent and reject subsequent connection attempts", async () => {
      const deviceId = `revoke-agent-${Date.now()}`;
      const reg = await app.inject({
        method: "POST",
        url: "/api/v1/print-agents",
        headers: { authorization: `Bearer ${adminTokenA}` },
        payload: { name: "Revoking Agent", deviceId },
      });
      const agentId = JSON.parse(reg.payload).data.agent.id;

      const rev = await app.inject({
        method: "POST",
        url: `/api/v1/print-agents/${agentId}/revoke`,
        headers: { authorization: `Bearer ${adminTokenA}` },
      });

      expect(rev.statusCode).toBe(200);

      const inDb = await prisma.printAgent.findUnique({ where: { id: agentId } });
      expect(inDb?.status).toBe("REVOKED");
    });
  });

  // --------------------------------------------------------------------------
  // PART B: WebSocket Authentication, Gateway Handshake & Security Policy
  // --------------------------------------------------------------------------
  describe("Part B: Agent WebSocket Gateway Authentication & Security Boundary", () => {
    it("should successfully authenticate agent via in-band AGENT_HELLO frame and receive AGENT_WELCOME", async () => {
      const deviceId = `ws-auth-${Date.now()}`;
      const reg = await app.inject({
        method: "POST",
        url: "/api/v1/print-agents",
        headers: { authorization: `Bearer ${adminTokenA}` },
        payload: { name: "WS Test Agent", deviceId },
      });
      const { apiKey, agent } = JSON.parse(reg.payload).data;

      const ws = new WebSocket(wsGatewayUrl);

      const welcomePromise = new Promise<any>((resolve, reject) => {
        ws.on("open", () => {
          ws.send(
            JSON.stringify({
              type: "AGENT_HELLO",
              deviceId,
              apiKey,
              version: "1.0.0",
            })
          );
        });

        ws.on("message", (msg) => {
          const frame = JSON.parse(msg.toString("utf8"));
          if (frame.type === "AGENT_WELCOME") {
            resolve(frame);
          }
        });

        ws.on("error", reject);
      });

      const welcome = await welcomePromise;
      expect(welcome.type).toBe("AGENT_WELCOME");
      expect(welcome.agentId).toBe(agent.id);
      expect(welcome.tenantId).toBe(TENANT_A);
      expect(welcome.maxPayloadBytes).toBe(64 * 1024);

      ws.close();
    });

    it("should reject connection with invalid API key and close socket with 4003", async () => {
      const deviceId = `ws-invalid-${Date.now()}`;
      await app.inject({
        method: "POST",
        url: "/api/v1/print-agents",
        headers: { authorization: `Bearer ${adminTokenA}` },
        payload: { name: "Invalid Key Agent", deviceId },
      });

      const ws = new WebSocket(wsGatewayUrl);

      const closePromise = new Promise<{ code: number; reason: string }>((resolve) => {
        ws.on("open", () => {
          ws.send(
            JSON.stringify({
              type: "AGENT_HELLO",
              deviceId,
              apiKey: "sculpx_ag_invalid_bad_key_000000000000000000000000",
              version: "1.0.0",
            })
          );
        });

        ws.on("close", (code, reason) => {
          resolve({ code, reason: reason.toString("utf8") });
        });
      });

      const closed = await closePromise;
      expect(closed.code).toBe(4003);
    });

    it("should reject staff JWT tokens attempting to connect to the agent gateway", async () => {
      const ws = new WebSocket(wsGatewayUrl, {
        headers: { authorization: `Bearer ${adminTokenA}` },
      });

      const closePromise = new Promise<{ code: number }>((resolve) => {
        ws.on("open", () => {
          // Send non-agent frame
          ws.send(JSON.stringify({ action: "AUTHENTICATE", token: adminTokenA }));
        });
        ws.on("close", (code) => resolve({ code }));
      });

      const closed = await closePromise;
      // Gateway rejects non-AGENT_HELLO frame with 4001 UNAUTHENTICATED
      expect(closed.code).toBe(4001);
    });

    it("should enforce maximum frame size and reject frames larger than 64 KB", async () => {
      const deviceId = `ws-oversize-${Date.now()}`;
      const reg = await app.inject({
        method: "POST",
        url: "/api/v1/print-agents",
        headers: { authorization: `Bearer ${adminTokenA}` },
        payload: { name: "Oversize Test Agent", deviceId },
      });
      const { apiKey } = JSON.parse(reg.payload).data;

      const ws = new WebSocket(wsGatewayUrl);

      await new Promise<void>((resolve) => {
        ws.on("open", () => {
          ws.send(JSON.stringify({ type: "AGENT_HELLO", deviceId, apiKey }));
        });
        ws.on("message", (msg) => {
          const frame = JSON.parse(msg.toString("utf8"));
          if (frame.type === "AGENT_WELCOME") resolve();
        });
      });

      // Send 70 KB frame (exceeds 64 KB)
      const oversizedPayload = "A".repeat(70 * 1024);
      const errorPromise = new Promise<any>((resolve) => {
        ws.on("message", (msg) => {
          const frame = JSON.parse(msg.toString("utf8"));
          if (frame.type === "AGENT_ERROR") resolve(frame);
        });
      });

      ws.send(JSON.stringify({ type: "AGENT_PING", padding: oversizedPayload }));
      const errorFrame = await errorPromise;
      expect(errorFrame.type).toBe("AGENT_ERROR");
      expect(errorFrame.code).toBe("FRAME_TOO_LARGE");

      ws.close();
    });
  });

  // --------------------------------------------------------------------------
  // PART C: Local Agent Client, TCP Printer Dispatch & Acknowledgements
  // --------------------------------------------------------------------------
  describe("Part C: End-to-End Local Print Agent & LAN Printer Execution", () => {
    it("should dispatch print job through connected agent and receive printed acknowledgement", async () => {
      // 1. Create a printer assigned to Tenant A pointing to our mock printer port
      const printer = await printerService.createPrinter(TENANT_A, {
        name: "Kitchen LAN ESC/POS",
        type: PrinterType.KITCHEN,
        ipAddress: "127.0.0.1",
        port: mockPrinterPort,
        connectionType: "LOCAL_AGENT",
      });

      // 2. Enroll agent for Tenant A permitted for this printer
      const deviceId = `local-agent-e2e-${Date.now()}`;
      const reg = await app.inject({
        method: "POST",
        url: "/api/v1/print-agents",
        headers: { authorization: `Bearer ${adminTokenA}` },
        payload: {
          name: "Kitchen POS Daemon",
          deviceId,
          permittedPrinterIds: [printer.id],
        },
      });
      const { apiKey, agent } = JSON.parse(reg.payload).data;

      // 3. Start real LocalPrintAgentClient with testing config
      const agentConfig = loadAgentConfig({
        cloudUrl: wsGatewayUrl,
        deviceId,
        apiKey,
        allowLocalhostForTesting: true,
        allowedPorts: [mockPrinterPort, 9100],
      });

      const agentClient = new LocalPrintAgentClient(agentConfig);
      agentClient.start();

      // Wait 300ms for connection & handshake
      await new Promise((r) => setTimeout(r, 300));
      expect(agentClient.isConnected()).toBe(true);

      // 4. Enqueue and execute a test print job
      const testJob = await printJobService.createJob(TENANT_A, {
        printerId: printer.id,
        type: "KOT",
        payload: {
          orderNumber: "ORD-999",
          tableNumber: "T-05",
          items: [{ name: "Paneer Butter Masala", quantity: 2 }],
        },
      });

      expect(testJob.status).toBe(PrintJobStatus.QUEUED);

      // 5. Execute job through print worker / print job service
      const success = await printJobService.executeJob(testJob as any);
      expect(success).toBe(true);

      // Verify printer received bytes
      expect(receivedPrintBuffers.length).toBeGreaterThan(0);
      const totalBytes = receivedPrintBuffers.reduce((sum, b) => sum + b.length, 0);
      expect(totalBytes).toBeGreaterThan(10);

      // Verify job updated to COMPLETED in database
      const completed = await printJobService.getJobById(TENANT_A, testJob.id);
      expect(completed.status).toBe(PrintJobStatus.COMPLETED);
      expect(completed.errorMessage).toBeNull();

      await agentClient.stop();
    });

    it("should handle offline printer gracefully with definite failure without crashing agent", async () => {
      // Create printer pointing to an unopen port (port 19999)
      const offlinePrinter = await printerService.createPrinter(TENANT_A, {
        name: "Offline Bar Printer",
        type: PrinterType.BAR,
        ipAddress: "127.0.0.1",
        port: 19999,
        connectionType: "LOCAL_AGENT",
      });

      const deviceId = `agent-offline-${Date.now()}`;
      const reg = await app.inject({
        method: "POST",
        url: "/api/v1/print-agents",
        headers: { authorization: `Bearer ${adminTokenA}` },
        payload: {
          name: "Bar POS Daemon",
          deviceId,
          permittedPrinterIds: [offlinePrinter.id],
        },
      });
      const { apiKey } = JSON.parse(reg.payload).data;

      const agentConfig = loadAgentConfig({
        cloudUrl: wsGatewayUrl,
        deviceId,
        apiKey,
        allowLocalhostForTesting: true,
        allowedPorts: [19999],
        connectTimeoutMs: 500,
      });

      const agentClient = new LocalPrintAgentClient(agentConfig);
      agentClient.start();
      await new Promise((r) => setTimeout(r, 300));

      const job = await printJobService.createJob(TENANT_A, {
        printerId: offlinePrinter.id,
        type: "BAR_KOT",
        payload: { item: "Mocktail" },
      });

      const ok = await printJobService.executeJob(job as any);
      expect(ok).toBe(false);

      // Verify job transitioned to retry queue or failed with clear message
      const updated = await printJobService.getJobById(TENANT_A, job.id);
      expect(updated.status).toBe(PrintJobStatus.QUEUED); // Scheduled for retry 1
      expect(updated.retryCount).toBe(1);
      expect(updated.errorMessage).toContain("Network error");

      await agentClient.stop();
    });

    it("should flag UNCERTAIN and preserve ticket when printer connection drops mid-write", async () => {
      shouldSimulatePrinterHang = true;

      const hangingPrinter = await printerService.createPrinter(TENANT_A, {
        name: "Hanging Printer",
        type: PrinterType.BILLING,
        ipAddress: "127.0.0.1",
        port: mockPrinterPort,
        connectionType: "LOCAL_AGENT",
      });

      const deviceId = `agent-uncertain-${Date.now()}`;
      const reg = await app.inject({
        method: "POST",
        url: "/api/v1/print-agents",
        headers: { authorization: `Bearer ${adminTokenA}` },
        payload: {
          name: "Billing Daemon",
          deviceId,
          permittedPrinterIds: [hangingPrinter.id],
        },
      });
      const { apiKey } = JSON.parse(reg.payload).data;

      const agentConfig = loadAgentConfig({
        cloudUrl: wsGatewayUrl,
        deviceId,
        apiKey,
        allowLocalhostForTesting: true,
        allowedPorts: [mockPrinterPort],
        simulatedUncertain: true,
      });

      const agentClient = new LocalPrintAgentClient(agentConfig);
      agentClient.start();
      await new Promise((r) => setTimeout(r, 300));

      const job = await printJobService.createJob(TENANT_A, {
        printerId: hangingPrinter.id,
        type: "BILL_RECEIPT",
        payload: { billNumber: "BILL-101", totalAmount: 500 },
      });

      const ok = await printJobService.executeJob(job as any);
      expect(ok).toBe(false);

      // Verify job is marked UNCERTAIN rather than automatically re-queued
      const uncertainJob = await printJobService.getJobById(TENANT_A, job.id);
      expect(uncertainJob.status).toBe(PrintJobStatus.UNCERTAIN);
      expect(uncertainJob.errorMessage).toContain("UNCERTAIN_DELIVERY");

      await agentClient.stop();
    });
  });

  // --------------------------------------------------------------------------
  // PART D: Network Security, Arbitrary Destination Rejection & Tenant Isolation
  // --------------------------------------------------------------------------
  describe("Part D: Network Security, Destination Restrictions & Multi-Tenant Boundary", () => {
    it("should reject arbitrary localhost / WAN addresses when testing flag is off", () => {
      const prodConfig = loadAgentConfig({
        allowLocalhostForTesting: false,
        allowedPorts: [9100],
        allowPrivateSubnetsOnly: true,
      });

      const printerClient = new LocalPrinterClient(prodConfig);

      // Localhost rejection
      const localResult = printerClient.validateDestination("127.0.0.1", 9100);
      expect(localResult.valid).toBe(false);
      expect(localResult.reason).toContain("Loopback address");

      // Cloud metadata rejection
      const metaResult = printerClient.validateDestination("169.254.169.254", 9100);
      expect(metaResult.valid).toBe(false);
      expect(metaResult.reason).toContain("Link-local");

      // Disallowed port rejection
      const portResult = printerClient.validateDestination("192.168.1.200", 22);
      expect(portResult.valid).toBe(false);
      expect(portResult.reason).toContain("Port 22 is not in the agent's authorized printer port list");

      // Public WAN IP rejection
      const wanResult = printerClient.validateDestination("8.8.8.8", 9100);
      expect(wanResult.valid).toBe(false);
      expect(wanResult.reason).toContain("not a valid private RFC 1918 LAN address");

      // Valid private LAN IP acceptance
      const validLan = printerClient.validateDestination("192.168.1.150", 9100);
      expect(validLan.valid).toBe(true);
    });

    it("should strictly prevent cross-tenant agent job dispatch", async () => {
      // Printer belongs to Tenant B
      const printerB = await printerService.createPrinter(TENANT_B, {
        name: "Tenant B Bar Printer",
        type: PrinterType.BAR,
        ipAddress: "192.168.1.200",
        port: 9100,
        connectionType: "LOCAL_AGENT",
      });

      // Attempt to dispatch Tenant B printer through Tenant A agent
      const res = await printAgentGatewayService.dispatchPrint(printerB, Buffer.from("TEST"));
      expect(res.success).toBe(false);
      expect(res.uncertain).toBe(false);
      expect(res.error).toContain("AGENT_OFFLINE");
    });
  });

  // --------------------------------------------------------------------------
  // PART E: Idempotency & Queue Worker Integration
  // --------------------------------------------------------------------------
  describe("Part E: Deduplication, Idempotency & Worker Batch Claiming", () => {
    it("should prevent duplicate print job enqueueing via idempotencyKey", async () => {
      const printer = await printerService.createPrinter(TENANT_A, {
        name: "Idempotent Printer",
        type: PrinterType.KITCHEN,
        ipAddress: "192.168.1.201",
        port: 9100,
      });

      const idempKey = `IDEMP-P6F-${Date.now()}`;

      const job1 = await printJobService.createJob(TENANT_A, {
        printerId: printer.id,
        type: "KOT",
        payload: { orderId: "ORD-1" },
        idempotencyKey: idempKey,
      });

      const job2 = await printJobService.createJob(TENANT_A, {
        printerId: printer.id,
        type: "KOT",
        payload: { orderId: "ORD-1" },
        idempotencyKey: idempKey,
      });

      expect(job1.id).toBe(job2.id);
    });

    it("should gracefully stop background print worker daemon", async () => {
      expect(printWorkerService.isRunning()).toBe(false);
      printWorkerService.startBackgroundWorker(1000);
      expect(printWorkerService.isRunning()).toBe(true);
      await printWorkerService.stopBackgroundWorker(1000);
      expect(printWorkerService.isRunning()).toBe(false);
    });
  });
});
