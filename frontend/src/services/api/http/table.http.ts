import { ITableService } from "../interfaces";
import { ApiResponse, Table } from "@/types";
import { apiClient } from "../client";

export class HttpTableService implements ITableService {
  async getTables(params?: { includeInactive?: boolean; section?: string }): Promise<ApiResponse<Table[]>> {
    const searchParams = new URLSearchParams();
    if (params?.includeInactive) searchParams.set("includeInactive", "true");
    if (params?.section) searchParams.set("section", params.section);
    const qs = searchParams.toString();
    return apiClient.get<Table[]>(`/tables${qs ? `?${qs}` : ""}`);
  }

  async getTableById(id: string): Promise<ApiResponse<Table>> {
    return apiClient.get<Table>(`/tables/${encodeURIComponent(id)}`);
  }

  async createTable(data: { tableNumber: string; displayName: string; capacity: number; section: string }): Promise<ApiResponse<Table>> {
    return apiClient.post<Table>("/tables", data);
  }

  async updateTable(
    id: string,
    data: Partial<{ tableNumber: string; displayName: string; capacity: number; section: string; status: Table["status"]; isActive: boolean }>
  ): Promise<ApiResponse<Table>> {
    return apiClient.patch<Table>(`/tables/${encodeURIComponent(id)}`, data);
  }

  async updateTableStatus(id: string, status: Table["status"]): Promise<ApiResponse<Table>> {
    return apiClient.patch<Table>(`/tables/${encodeURIComponent(id)}/status`, { status });
  }

  async rotateTableQr(id: string): Promise<ApiResponse<{ tableId: string; qrToken: string }>> {
    return apiClient.post<{ tableId: string; qrToken: string }>(`/tables/${encodeURIComponent(id)}/qr/rotate`);
  }

  async deactivateTable(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/tables/${encodeURIComponent(id)}`);
  }
}
