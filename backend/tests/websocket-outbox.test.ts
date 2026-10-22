import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "../src/database/prisma.js";
import { outboxService } from "../src/services/outbox.service.js";
import { websocketService } from "../src/services/websocket.service.js";
import type { ConnectedClient } from "../src/types/websocket.types.js";
import { OutboxStatus } from "@prisma/client";
import crypto from "node:crypto";
import type { WebSocket } from "ws";

describe("SCULPX E-Billing — Phase 3B.4 Realtime WebSocket & Outbox Integration Tests", () => {
  const TENANT_A = "e1b1d1f0-0000-4000-8000-000000000001";
  const TENANT_B = "e1b1d1f0-0000-4000-8000-000000000002";

  beforeEach(async () => {
    // Clear outbox events created during previous test runs
    await prisma.outboxEvent.deleteMany({
      where: {
        tenantId: { in: [TENANT_A, TENANT_B] },
      },
    });
    outboxService.setDispatcher(null);
  });

  afterEach(() => {
    outboxService.setDispatcher(null);
    websocketService.shutdown();
  });

  describe("Part B: Transactional Outbox Delivery & Concurrency Safety", () => {
    it("should atomically claim pending outbox events across multiple worker processes without double-claim", async () => {
      // 1. Insert 5 pending outbox events
      for (let i = 0; i < 5; i++) {
        await prisma.outboxEvent.create({
          data: {
            tenantId: TENANT_A,
            eventType: "order.created",
            topic: "orders:all",
            payload: { testIndex: i },
            status: OutboxStatus.PENDING,
          },
        });
      }

      // 2. Simulate two concurrent worker processes claiming batches
      const [worker1Batch, worker2Batch] = await Promise.all([
        outboxService.claimPendingBatch(3),
        outboxService.claimPendingBatch(3),
      ]);

      // Verify that no event was claimed by both workers
      const worker1Ids = new Set(worker1Batch.map((e) => e.id));
      const worker2Ids = new Set(worker2Batch.map((e) => e.id));

      for (const id of worker1Ids) {
        expect(worker2Ids.has(id)).toBe(false);
      }

      expect(worker1Batch.length + worker2Batch.length).toBe(5);

      // Verify claimed events are transitioned to PROCESSING status
      for (const ev of [...worker1Batch, ...worker2Batch]) {
        expect(ev.status).toBe(OutboxStatus.PROCESSING);
      }
    });

    it("should implement bounded retries and transition to FAILED after 5 failed attempts", async () => {
      const event = await prisma.outboxEvent.create({
        data: {
          tenantId: TENANT_A,
          eventType: "order.created",
          topic: "orders:all",
          payload: { orderNumber: "ORD-FAIL-01" },
          status: OutboxStatus.PENDING,
          retryCount: 4, // 4 retries already failed
        },
      });

      // Inject a failing dispatcher
      outboxService.setDispatcher(async () => {
        throw new Error("Simulated WebSocket broker connection reset");
      });

      const success = await outboxService.dispatchEvent(event.id);
      expect(success).toBe(false);

      // Verify event transitioned to FAILED
      const updated = await prisma.outboxEvent.findUnique({
        where: { id: event.id },
      });

      expect(updated?.status).toBe(OutboxStatus.FAILED);
      expect(updated?.retryCount).toBe(5);
      expect(updated?.lastError).toContain("Simulated WebSocket broker connection reset");
    });

    it("should calculate correct exponential backoff schedule", () => {
      expect(outboxService.calculateBackoffMs(0)).toBe(1000);
      expect(outboxService.calculateBackoffMs(1)).toBe(2000);
      expect(outboxService.calculateBackoffMs(2)).toBe(4000);
      expect(outboxService.calculateBackoffMs(3)).toBe(8000);
      expect(outboxService.calculateBackoffMs(4)).toBe(16000);
      expect(outboxService.calculateBackoffMs(5)).toBe(30000); // capped at 30,000ms
    });

    it("should provide visibility into failed events and support manual retry recovery", async () => {
      const failedEvent = await prisma.outboxEvent.create({
        data: {
          tenantId: TENANT_A,
          eventType: "kot.created",
          topic: "kitchen:kots",
          payload: { kotNumber: "KOT-RETRY-01" },
          status: OutboxStatus.FAILED,
          retryCount: 5,
          lastError: "Network timeout",
        },
      });

      // 1. Inspect failed events
      const failedList = await outboxService.getFailedEvents(TENANT_A);
      expect(failedList.some((e) => e.id === failedEvent.id)).toBe(true);

      // 2. Retry single failed event
      let retryDispatched = false;
      outboxService.setDispatcher(async (e) => {
        if (e.id === failedEvent.id) retryDispatched = true;
      });

      const recovered = await outboxService.retryFailedEvent(failedEvent.id);
      expect(recovered).toBe(true);
      expect(retryDispatched).toBe(true);

      const postRetry = await prisma.outboxEvent.findUnique({
        where: { id: failedEvent.id },
      });
      expect(postRetry?.status).toBe(OutboxStatus.PUBLISHED);
      expect(postRetry?.retryCount).toBe(0);
      expect(postRetry?.lastError).toBeNull();
    });

    it("should guarantee that a WebSocket dispatch failure cannot invalidate an already-created order", async () => {
      // In our architecture, the order commits inside prisma.$transaction.
      // Even if dispatchEvent fails or throws, the order row remains permanently in PostgreSQL.
      const order = await prisma.order.create({
        data: {
          tenantId: TENANT_A,
          orderNumber: `ORD-TX-SAFE-${Date.now()}`,
          source: "CUSTOMER_QR",
          paymentPreference: "PAY_LATER",
          subtotal: 500,
          taxTotal: 25,
          grandTotal: 525,
        },
      });

      const outboxEvent = await prisma.outboxEvent.create({
        data: {
          tenantId: TENANT_A,
          eventType: "order.created",
          topic: "orders:all",
          payload: { orderId: order.id },
          status: OutboxStatus.PENDING,
        },
      });

      // WebSocket transport explodes
      outboxService.setDispatcher(async () => {
        throw new Error("TCP Socket ECONNREFUSED");
      });

      const ok = await outboxService.dispatchEvent(outboxEvent.id);
      expect(ok).toBe(false);

      // Verify the business order is STILL completely valid and committed in database
      const verifiedOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });
      expect(verifiedOrder).not.toBeNull();
      expect(verifiedOrder?.orderNumber).toBe(order.orderNumber);

      // Cleanup
      await prisma.order.delete({ where: { id: order.id } });
    });
  });

  describe("Part C: WebSocket Subscriptions & Multi-Tenant Authorization", () => {
    function createMockSocket() {
      const messages: string[] = [];
      const socket = {
        readyState: 1 /* OPEN */,
        send: vi.fn((data: string) => {
          messages.push(data);
        }),
        close: vi.fn(),
        on: vi.fn(),
      } as unknown as WebSocket;

      return { socket, messages };
    }

    it("should broadcast order.created and kot.created to authorized kitchen and staff clients", () => {
      const { socket: kitchenSocket, messages: kitchenMessages } = createMockSocket();
      const { socket: waiterSocket, messages: waiterMessages } = createMockSocket();

      // Register Kitchen staff client
      const kitchenClient: ConnectedClient = {
        id: "kitchen-client-1",
        socket: kitchenSocket,
        tenantId: TENANT_A,
        role: "KITCHEN_STAFF",
        permissions: ["kds_access"],
        isGuest: false,
        topics: new Set(["kitchen:kots"]),
        connectedAt: new Date(),
        orderIds: new Set(),
      };

      // Register Waiter staff client
      const waiterClient: ConnectedClient = {
        id: "waiter-client-1",
        socket: waiterSocket,
        tenantId: TENANT_A,
        role: "WAITER",
        permissions: ["pos_access"],
        isGuest: false,
        topics: new Set(["orders:all"]),
        connectedAt: new Date(),
        orderIds: new Set(),
      };

      // Add clients to service
      (websocketService as any).clients.set(kitchenClient.id, kitchenClient);
      (websocketService as any).clients.set(waiterClient.id, waiterClient);

      // 1. Broadcast kot.created on kitchen:kots
      websocketService.broadcastEvent({
        tenantId: TENANT_A,
        eventType: "kot.created",
        topic: "kitchen:kots",
        payload: { kotNumber: "KOT-101", station: "Main Kitchen" },
      });

      expect(kitchenMessages.length).toBe(1);
      const kitchenFrame = JSON.parse(kitchenMessages[0]);
      expect(kitchenFrame.type).toBe("KOT_CREATED");
      expect(kitchenFrame.topic).toBe("kitchen:kots");
      expect(kitchenFrame.payload.kotNumber).toBe("KOT-101");
      expect(waiterMessages.length).toBe(0); // Waiter was NOT subscribed to kitchen:kots

      // 2. Broadcast order.created on orders:all
      websocketService.broadcastEvent({
        tenantId: TENANT_A,
        eventType: "order.created",
        topic: "orders:all",
        payload: { orderNumber: "ORD-202", grandTotal: 840 },
      });

      expect(waiterMessages.length).toBe(1);
      const waiterFrame = JSON.parse(waiterMessages[0]);
      expect(waiterFrame.type).toBe("ORDER_CREATED");
      expect(waiterFrame.topic).toBe("orders:all");
      expect(waiterFrame.payload.orderNumber).toBe("ORD-202");
    });

    it("should enforce strict tenant isolation and never deliver events across tenants", () => {
      const { socket: tenantASocket, messages: tenantAMessages } = createMockSocket();
      const { socket: tenantBSocket, messages: tenantBMessages } = createMockSocket();

      const clientA: ConnectedClient = {
        id: "tenant-a-client",
        socket: tenantASocket,
        tenantId: TENANT_A,
        role: "KITCHEN_STAFF",
        permissions: [],
        isGuest: false,
        topics: new Set(["kitchen:kots"]),
        connectedAt: new Date(),
        orderIds: new Set(),
      };

      const clientB: ConnectedClient = {
        id: "tenant-b-client",
        socket: tenantBSocket,
        tenantId: TENANT_B, // Different Tenant!
        role: "KITCHEN_STAFF",
        permissions: [],
        isGuest: false,
        topics: new Set(["kitchen:kots"]),
        connectedAt: new Date(),
        orderIds: new Set(),
      };

      (websocketService as any).clients.set(clientA.id, clientA);
      (websocketService as any).clients.set(clientB.id, clientB);

      // Emit event for Tenant A
      websocketService.broadcastEvent({
        tenantId: TENANT_A,
        eventType: "kot.created",
        topic: "kitchen:kots",
        payload: { kotNumber: "KOT-TENANT-A-CONFIDENTIAL" },
      });

      expect(tenantAMessages.length).toBe(1);
      expect(tenantBMessages.length).toBe(0); // Zero delivery to Tenant B!

      // Emit event for Tenant B
      websocketService.broadcastEvent({
        tenantId: TENANT_B,
        eventType: "order.created",
        topic: "orders:all",
        payload: { orderNumber: "ORD-TENANT-B-CONFIDENTIAL" },
      });

      expect(tenantAMessages.length).toBe(1); // Still 1
      expect(tenantBMessages.length).toBe(0); // Client B is not subscribed to orders:all
    });

    it("should reject unauthorized subscriptions by guests to staff channels (kitchen:kots, billing:all)", () => {
      const { socket, messages } = createMockSocket();

      const guestClient: ConnectedClient = {
        id: "guest-client-01",
        socket,
        tenantId: TENANT_A,
        role: "GUEST",
        permissions: ["guest_order"],
        isGuest: true,
        topics: new Set(),
        connectedAt: new Date(),
        orderIds: new Set(["ord-guest-999"]),
      };

      // Attempt 1: Guest tries to subscribe to kitchen:kots
      (websocketService as any).authorizeAndSubscribe(guestClient, "kitchen:kots");
      expect(guestClient.topics.has("kitchen:kots")).toBe(false);

      const errFrame1 = JSON.parse(messages[messages.length - 1]);
      expect(errFrame1.type).toBe("ERROR");
      expect(errFrame1.error.code).toBe("FORBIDDEN");

      // Attempt 2: Guest tries to subscribe to billing:all
      (websocketService as any).authorizeAndSubscribe(guestClient, "billing:all");
      expect(guestClient.topics.has("billing:all")).toBe(false);

      // Attempt 3: Guest subscribes to their own specific order topic -> Permitted!
      (websocketService as any).authorizeAndSubscribe(guestClient, "order:ord-guest-999");
      expect(guestClient.topics.has("order:ord-guest-999")).toBe(true);
    });
  });
});
