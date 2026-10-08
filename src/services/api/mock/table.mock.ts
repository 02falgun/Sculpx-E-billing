import { ITableService } from "../interfaces";
import { ApiResponse, Table } from "@/types";
import { MOCK_TABLES } from "@/mocks/mockDb";

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockTableService implements ITableService {
  private tables: Table[] = [...MOCK_TABLES];

  async getTables(): Promise<ApiResponse<Table[]>> {
    await delay(100);
    return { success: true, data: this.tables };
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
}
