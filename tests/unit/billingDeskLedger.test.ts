import { describe, it, expect, beforeEach } from "vitest";
import { MockBillingService } from "@/services/api/mock/billing.mock";

describe("Billing Desk Ledger & Order Records (Phase 8)", () => {
  let billingService: MockBillingService;

  beforeEach(() => {
    billingService = new MockBillingService();
  });

  it("should retrieve paginated list of all bills", async () => {
    const res = await billingService.getAllBills({
      pagination: { page: 1, limit: 10 },
    });

    expect(res.success).toBe(true);
    expect(res.data.data.length).toBeGreaterThanOrEqual(1);
    expect(res.data.total).toBeGreaterThanOrEqual(1);
    expect(res.data.data[0].billNumber).toBeDefined();
  });

  it("should filter bills by status", async () => {
    const res = await billingService.getAllBills({
      status: "ISSUED",
      pagination: { page: 1, limit: 10 },
    });

    expect(res.success).toBe(true);
    res.data.data.forEach((b) => {
      expect(b.status).toBe("ISSUED");
    });
  });
});
