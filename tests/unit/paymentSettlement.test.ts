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
});
