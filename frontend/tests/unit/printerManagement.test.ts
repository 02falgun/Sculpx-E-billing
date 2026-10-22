import { describe, it, expect, beforeEach } from "vitest";
import { MockPrinterService } from "@/services/api/mock/printer.mock";

describe("Printer Fleet & Print Queue Engine (Phase 9)", () => {
  let printerService: MockPrinterService;

  beforeEach(() => {
    printerService = new MockPrinterService();
  });

  it("should retrieve fleet of thermal printers", async () => {
    const res = await printerService.getPrinters();
    expect(res.success).toBe(true);
    expect(res.data.length).toBeGreaterThanOrEqual(2);
    expect(res.data[0].id).toBeDefined();
    expect(res.data[0].name).toBeDefined();
    expect(res.data[0].status).toBeDefined();
  });

  it("should retrieve paginated print queue jobs", async () => {
    const res = await printerService.getPrintJobs({
      pagination: { page: 1, limit: 10 },
    });
    expect(res.success).toBe(true);
    expect(res.data.data.length).toBeGreaterThanOrEqual(1);
    expect(res.data.total).toBeGreaterThanOrEqual(1);
  });
});
