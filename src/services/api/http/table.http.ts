import { ITableService } from "../interfaces";
import { ApiResponse, Table } from "@/types";
import { apiClient } from "../client";

export class HttpTableService implements ITableService {
  async getTables(): Promise<ApiResponse<Table[]>> {
    return apiClient.get<Table[]>("/tables");
  }

  async getTableById(id: string): Promise<ApiResponse<Table>> {
    return apiClient.get<Table>(`/tables/${encodeURIComponent(id)}`);
  }

  async updateTableStatus(id: string, status: Table["status"]): Promise<ApiResponse<Table>> {
    return apiClient.patch<Table>(`/tables/${encodeURIComponent(id)}/status`, { status });
  }
}
