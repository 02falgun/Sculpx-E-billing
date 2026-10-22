import { describe, it, expect, beforeEach } from "vitest";
import { MockOrderService } from "@/services/api/mock/order.mock";

describe("Order Lifecycle & State Transitions (Phase 4)", () => {
  let orderService: MockOrderService;

  beforeEach(() => {
    orderService = new MockOrderService();
  });

  it("should retrieve existing mock order by id", async () => {
    const res = await orderService.getOrderById("ord-1001");
    expect(res.success).toBe(true);
    expect(res.data.id).toBe("ord-1001");
    expect(res.data.status).toBe("PREPARING");
    expect(res.data.timeline.length).toBeGreaterThanOrEqual(1);
  });

  it("should reject customer cancellation when food is already PREPARING", async () => {
    const res = await orderService.cancelOrder("ord-1001", "Leaving restaurant");
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe("ORDER_CANNOT_BE_CANCELLED");
    expect(res.error?.message).toMatch(/already in preparation/i);
  });

  it("should permit customer cancellation when order is in PLACED stage", async () => {
    // 1. Create fresh order in PLACED stage
    const createRes = await orderService.createOrder({
      qrToken: "table-token-5",
      paymentPreference: "PAY_LATER",
      items: [
        {
          menuItemId: "item-cold-brew",
          quantity: 1,
          modifierIds: [],
        },
      ],
    });

    expect(createRes.success).toBe(true);
    const newOrderId = createRes.data.id;
    expect(createRes.data.status).toBe("PLACED");

    // 2. Cancel order
    const cancelRes = await orderService.cancelOrder(newOrderId, "Ordered by mistake");
    expect(cancelRes.success).toBe(true);
    expect(cancelRes.data.status).toBe("CANCELLED");
    expect(cancelRes.data.cancellation?.reason).toBe("Ordered by mistake");
    expect(cancelRes.data.cancellation?.cancelledBy).toBe("CUSTOMER");
  });

  it("should advance order status and append timeline events", async () => {
    const createRes = await orderService.createOrder({
      qrToken: "table-token-5",
      paymentPreference: "PAY_NOW",
      items: [
        {
          menuItemId: "item-cold-brew",
          quantity: 1,
          modifierIds: [],
        },
      ],
    });

    const orderId = createRes.data.id;
    const initialTimelineLength = createRes.data.timeline.length;

    // Transition to CONFIRMED
    const confirmRes = await orderService.updateOrderStatus(orderId, "CONFIRMED", "Captain accepted");
    expect(confirmRes.success).toBe(true);
    expect(confirmRes.data.status).toBe("CONFIRMED");
    expect(confirmRes.data.timeline.length).toBe(initialTimelineLength + 1);

    // Transition to READY
    const readyRes = await orderService.updateOrderStatus(orderId, "READY", "Plated at pickup counter");
    expect(readyRes.success).toBe(true);
    expect(readyRes.data.status).toBe("READY");
    expect(readyRes.data.timeline.length).toBe(initialTimelineLength + 2);
  });
});
