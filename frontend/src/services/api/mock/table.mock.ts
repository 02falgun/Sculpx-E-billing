import { ITableService } from "../interfaces";
import { ApiResponse, Table } from "@/types";
import { MOCK_TABLES } from "@/mocks/mockDb";

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockTableService implements ITableService {
  private tables: Table[] = [...MOCK_TABLES];

  async getTables(params?: { includeInactive?: boolean; section?: string }): Promise<ApiResponse<Table[]>> {
    await delay(100);
    let list = this.tables;
    if (!params?.includeInactive) {
      list = list.filter((t) => (t as any).isActive !== false);
    }
    if (params?.section) {
      list = list.filter((t) => t.section === params.section);
    }
    return { success: true, data: list };
  }

  async getTableById(id: string): Promise<ApiResponse<Table>> {
    await delay(100);
    const table = this.tables.find((t) => t.id === id);
    if (!table) {
      return {
        success: false,
        data: null as unknown as Table,
        error: { code: "TABLE_NOT_FOUND", message: "Table not found" },
      };
    }
    return { success: true, data: table };
  }

  async createTable(data: { tableNumber: string; displayName: string; capacity: number; section: string }): Promise<ApiResponse<Table>> {
    await delay(150);
    const newTable: Table = {
      id: `tbl-mock-${Date.now()}`,
      tableNumber: data.tableNumber,
      section: data.section,
      capacity: data.capacity,
      status: "AVAILABLE",
      qrToken: `mock-qr-${data.tableNumber}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    (newTable as any).isActive = true;
    (newTable as any).displayName = data.displayName;
    this.tables.push(newTable);
    return { success: true, data: newTable, message: "Table created" };
  }

  async updateTable(
    id: string,
    data: Partial<{ tableNumber: string; displayName: string; capacity: number; section: string; status: Table["status"]; isActive: boolean }>
  ): Promise<ApiResponse<Table>> {
    await delay(150);
    const table = this.tables.find((t) => t.id === id);
    if (!table) {
      return { success: false, data: null as unknown as Table, error: { code: "NOT_FOUND", message: "Table not found" } };
    }
    Object.assign(table, data);
    table.updatedAt = new Date().toISOString();
    return { success: true, data: table, message: "Table updated" };
  }

  async updateTableStatus(id: string, status: Table["status"]): Promise<ApiResponse<Table>> {
    await delay(150);
    const table = this.tables.find((t) => t.id === id);
    if (!table) {
      return {
        success: false,
        data: null as unknown as Table,
        error: { code: "TABLE_NOT_FOUND", message: "Table not found" },
      };
    }
    table.status = status;
    table.updatedAt = new Date().toISOString();
    return { success: true, data: table, message: "Table status updated" };
  }

  async rotateTableQr(id: string): Promise<ApiResponse<{ tableId: string; qrToken: string }>> {
    await delay(150);
    const table = this.tables.find((t) => t.id === id);
    if (!table) {
      return { success: false, data: null as any, error: { code: "NOT_FOUND", message: "Table not found" } };
    }
    table.qrToken = `mock-rotated-${Date.now()}`;
    return { success: true, data: { tableId: id, qrToken: table.qrToken } };
  }

  async deactivateTable(id: string): Promise<ApiResponse<null>> {
    await delay(150);
    const table = this.tables.find((t) => t.id === id);
    if (table) {
      (table as any).isActive = false;
    }
    return { success: true, data: null };
  }
}
