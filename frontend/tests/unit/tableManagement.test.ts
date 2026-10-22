import { describe, it, expect, beforeEach } from "vitest";
import { MockTableService } from "@/services/api/mock/table.mock";
import { usePOSStore } from "@/store";
import { Table } from "@/types";

describe("Table Management & POS Store Engine (Phase 6)", () => {
  let tableService: MockTableService;

  beforeEach(() => {
    tableService = new MockTableService();
    usePOSStore.getState().resetDraft();
  });

  it("should retrieve mock tables list with capacity and sections", async () => {
    const res = await tableService.getTables();
    expect(res.success).toBe(true);
    expect(res.data.length).toBeGreaterThanOrEqual(3);
    const table5 = res.data.find((t) => t.tableNumber === "5");
    expect(table5).toBeDefined();
    expect(table5?.section).toBe("Main Dining");
  });

  it("should update table status", async () => {
    const updateRes = await tableService.updateTableStatus("tbl-1", "BILLED");
    expect(updateRes.success).toBe(true);
    expect(updateRes.data.status).toBe("BILLED");

    const getRes = await tableService.getTableById("tbl-1");
    expect(getRes.success).toBe(true);
    expect(getRes.data.status).toBe("BILLED");
  });

  it("should manage POS store draft selection", () => {
    const dummyTable: Table = {
      id: "tbl-5",
      tableNumber: "5",
      section: "Main Dining",
      capacity: 4,
      status: "AVAILABLE",
      qrToken: "table-token-5",
      createdAt: "",
      updatedAt: "",
    };

    usePOSStore.getState().setSelectedTable(dummyTable);
    expect(usePOSStore.getState().selectedTable?.tableNumber).toBe("5");
    expect(usePOSStore.getState().posType).toBe("TABLE");

    usePOSStore.getState().resetDraft();
    expect(usePOSStore.getState().selectedTable).toBeNull();
  });
});
