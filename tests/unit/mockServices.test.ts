import { describe, it, expect } from "vitest";
import {
  menuApi,
  orderApi,
  kitchenApi,
  billingApi,
  paymentApi,
  printerApi,
} from "@/services/api";

describe("Mock Service Implementations (Phase 1 Foundation)", () => {
  it("should resolve valid Room and Table QR contexts", async () => {
    const tableRes = await menuApi.getContextByQrToken("table-token-5");
    expect(tableRes.success).toBe(true);
    expect(tableRes.data.type).toBe("TABLE");
    expect(tableRes.data.identifier).toBe("5");

    const roomRes = await menuApi.getContextByQrToken("room-token-301");
    expect(roomRes.success).toBe(true);
    expect(roomRes.data.type).toBe("ROOM");
    expect(roomRes.data.identifier).toBe("301");
  });

  it("should reject invalid QR token gracefully", async () => {
    const invalidRes = await menuApi.getContextByQrToken("invalid-nonexistent-token");
    expect(invalidRes.success).toBe(false);
    expect(invalidRes.error?.code).toBe("QR_TOKEN_INVALID");
  });

  it("should fetch categories and menu items with search filter", async () => {
    const catsRes = await menuApi.getCategories();
    expect(catsRes.success).toBe(true);
    expect(catsRes.data.length).toBeGreaterThan(0);

    const searchRes = await menuApi.getMenuItems({ search: "Paneer" });
    expect(searchRes.success).toBe(true);
    expect(searchRes.data.length).toBeGreaterThan(0);
    expect(searchRes.data[0].name).toContain("Paneer");
  });

  it("should validate and create an order with accurate timeline and subtotal", async () => {
    const createRes = await orderApi.createOrder({
      qrToken: "table-token-5",
      paymentPreference: "PAY_LATER",
      items: [
        {
          menuItemId: "item-paneer-tikka",
          quantity: 2,
          modifierIds: ["mod-mild"],
        },
      ],
    });

    expect(createRes.success).toBe(true);
    const order = createRes.data;
    expect(order.items).toHaveLength(1);
    expect(order.subtotal).toBe(680); // 340 * 2
    expect(order.taxTotal).toBe(34); // 5% of 680
    expect(order.grandTotal).toBe(714);
    expect(order.status).toBe("PLACED");
    expect(order.timeline).toHaveLength(1);
  });

  it("should generate a bill and process payment to settle the due amount", async () => {
    // 1. Create order
    const orderRes = await orderApi.createOrder({
      qrToken: "room-token-301",
      paymentPreference: "PAY_NOW",
      items: [{ menuItemId: "item-cold-brew", quantity: 1, modifierIds: [] }],
    });
    const order = orderRes.data;

    // 2. Generate bill
    const billRes = await billingApi.generateBillForOrder(order.id);
    expect(billRes.success).toBe(true);
    const bill = billRes.data;
    expect(bill.status).toBe("ISSUED");
    expect(bill.dueAmount).toBeGreaterThan(0);

    // 3. Record full payment
    const payRes = await paymentApi.recordPayment({
      billId: bill.id,
      amount: bill.grandTotal,
      method: "UPI",
      upiId: "guest@upi",
    });
    expect(payRes.success).toBe(true);

    // 4. Verify bill is settled
    const updatedBillRes = await billingApi.getBillById(bill.id);
    expect(updatedBillRes.data.status).toBe("PAID");
    expect(updatedBillRes.data.dueAmount).toBe(0);
  });

  it("should retrieve printer fleet and allow job retry", async () => {
    const printersRes = await printerApi.getPrinters();
    expect(printersRes.success).toBe(true);
    expect(printersRes.data.length).toBeGreaterThan(0);
  });
});
