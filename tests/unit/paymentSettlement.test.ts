import { describe, it, expect, beforeEach } from "vitest";
import { MockPaymentService } from "@/services/api/mock/payment.mock";
import { MockBillingService } from "@/services/api/mock/billing.mock";

describe("Payment Settlement & Billing Engine (Phase 5)", () => {
  let paymentService: MockPaymentService;
  let billingService: MockBillingService;

  beforeEach(() => {
    paymentService = new MockPaymentService();
    billingService = new MockBillingService();
  });

  it("should fetch active bill by order ID or generate if missing", async () => {
    const res = await billingService.getBillByOrderId("ord-1001");
    expect(res.success).toBe(true);
    expect(res.data.orderId).toBe("ord-1001");
    expect(res.data.items.length).toBeGreaterThanOrEqual(1);
    expect(res.data.grandTotal).toBeGreaterThan(0);
  });

  it("should record payment, reduce due amount, and transition status to PAID", async () => {
    const billRes = await billingService.getBillByOrderId("ord-1001");
    expect(billRes.success).toBe(true);
    const bill = billRes.data;
    const initialDue = bill.dueAmount;

    // Settle full due amount
    const payRes = await paymentService.recordPayment({
      billId: bill.id,
      amount: initialDue,
      method: "UPI",
      upiId: "guest@okaxis",
    });

    expect(payRes.success).toBe(true);
    expect(payRes.data.status).toBe("SUCCESS");
    expect(payRes.data.amount).toBe(initialDue);

    // Verify bill state updated
    const updatedBillRes = await billingService.getBillById(bill.id);
    expect(updatedBillRes.success).toBe(true);
    expect(updatedBillRes.data.dueAmount).toBe(0);
    expect(updatedBillRes.data.status).toBe("PAID");
    expect(updatedBillRes.data.settledAt).toBeDefined();
  });

  it("should handle partial payments, decrement due amount, and transition to PARTIALLY_PAID", async () => {
    const billRes = await billingService.generateBillForOrder("ord-1002");
    expect(billRes.success).toBe(true);
    const bill = billRes.data;
    const initialGrandTotal = bill.grandTotal;

    // Partial payment of 200
    const partialPay = await paymentService.recordPayment({
      billId: bill.id,
      amount: 200,
      method: "CASH",
    });

    expect(partialPay.success).toBe(true);
    expect(bill.paidAmount).toBe(200);
    expect(bill.dueAmount).toBe(initialGrandTotal - 200);
    expect(bill.status).toBe("PARTIALLY_PAID");

    // Settle remaining balance
    const settlePay = await paymentService.recordPayment({
      billId: bill.id,
      amount: bill.dueAmount,
      method: "UPI",
    });

    expect(settlePay.success).toBe(true);
    expect(bill.paidAmount).toBe(initialGrandTotal);
    expect(bill.dueAmount).toBe(0);
    expect(bill.status).toBe("PAID");
  });

  it("should reject overpayment exceeding balance due with PAYMENT_EXCEEDS_DUE", async () => {
    const billRes = await billingService.generateBillForOrder("ord-1003");
    expect(billRes.success).toBe(true);
    const bill = billRes.data;

    const overpayRes = await paymentService.recordPayment({
      billId: bill.id,
      amount: bill.dueAmount + 1000,
      method: "CARD",
    });

    expect(overpayRes.success).toBe(false);
    expect(overpayRes.error?.code).toBe("PAYMENT_EXCEEDS_DUE");
  });

  it("should support payment idempotency and return cached result on replay", async () => {
    const billRes = await billingService.generateBillForOrder("ord-1004");
    expect(billRes.success).toBe(true);
    const bill = billRes.data;

    const idempotencyKey = `idemp-unit-${Date.now()}`;
    const payload = {
      billId: bill.id,
      amount: 100,
      method: "UPI" as const,
      idempotencyKey,
    };

    const res1 = await paymentService.recordPayment(payload);
    expect(res1.success).toBe(true);
    const pay1 = res1.data;

    // Replay with identical key
    const res2 = await paymentService.recordPayment(payload);
    expect(res2.success).toBe(true);
    const pay2 = res2.data;

    expect(pay2.id).toBe(pay1.id);
  });

  it("should apply discount and recalculate taxes on discounted subtotal", async () => {
    const billRes = await billingService.generateBillForOrder("ord-1005");
    expect(billRes.success).toBe(true);
    const bill = billRes.data;
    const originalSubtotal = bill.subtotal;
    const initialGrandTotal = bill.grandTotal;

    const discRes = await billingService.applyDiscount(bill.id, {
      type: "PERCENTAGE",
      value: 10,
      code: "SAVE10",
    });

    expect(discRes.success).toBe(true);
    const updated = discRes.data;
    const expectedDiscount = Math.round(originalSubtotal * 0.1 * 100) / 100;
    expect(updated.totalDiscount).toBe(expectedDiscount);
    expect(updated.discounts.length).toBeGreaterThanOrEqual(1);
    expect(updated.grandTotal).toBeLessThan(initialGrandTotal);
  });

  it("should void bill with reason and reject payment on voided bill", async () => {
    const billRes = await billingService.generateBillForOrder("ord-1006");
    expect(billRes.success).toBe(true);
    const bill = billRes.data;

    const voidRes = await billingService.voidBill(bill.id, "Table cancelled order");
    expect(voidRes.success).toBe(true);
    expect(voidRes.data.status).toBe("VOIDED");
    expect(voidRes.data.voidedReason).toBe("Table cancelled order");

    // Attempt to pay voided bill
    const payRes = await paymentService.recordPayment({
      billId: bill.id,
      amount: 100,
      method: "CASH",
    });

    expect(payRes.success).toBe(false);
    expect(payRes.error?.code).toBe("BILL_VOIDED");
  });
});
