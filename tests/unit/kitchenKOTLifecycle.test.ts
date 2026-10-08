import { describe, it, expect, beforeEach } from "vitest";
import { MockKitchenService } from "@/services/api/mock/kitchen.mock";

describe("Kitchen KOT Lifecycle & Stage Progression (Phase 7)", () => {
  let kitchenService: MockKitchenService;

  beforeEach(() => {
    kitchenService = new MockKitchenService();
  });

  it("should retrieve list of active KOTs", async () => {
    const res = await kitchenService.getActiveKOTs();
    expect(res.success).toBe(true);
    expect(res.data.length).toBeGreaterThanOrEqual(1);
    expect(res.data[0].kotNumber).toBeDefined();
    expect(res.data[0].items.length).toBeGreaterThan(0);
  });

  it("should advance KOT status to READY with timestamp", async () => {
    const activeRes = await kitchenService.getActiveKOTs();
    const firstKot = activeRes.data[0];

    const updateRes = await kitchenService.updateKOTStatus(firstKot.id, {
      status: "READY",
      note: "Dishes plated on expedite counter",
    });

    expect(updateRes.success).toBe(true);
    expect(updateRes.data.status).toBe("READY");
    expect(updateRes.data.preparedAt).toBeDefined();
  });

  it("should exclude SERVED KOTs from active ticket queue", async () => {
    const activeRes = await kitchenService.getActiveKOTs();
    const kotId = activeRes.data[0].id;

    // Transition to SERVED
    await kitchenService.updateKOTStatus(kotId, {
      status: "SERVED",
    });

    const refreshedRes = await kitchenService.getActiveKOTs();
    const stillActive = refreshedRes.data.some((k) => k.id === kotId);
    expect(stillActive).toBe(false);
  });
});
