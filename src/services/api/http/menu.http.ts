import { IMenuService } from "../interfaces";
import { ApiResponse, Category, MenuItem, QRContext } from "@/types";
import { apiClient } from "../client";

export class HttpMenuService implements IMenuService {
  async getContextByQrToken(qrToken: string): Promise<ApiResponse<QRContext>> {
    return apiClient.get<QRContext>(`/menu/context/${encodeURIComponent(qrToken)}`);
  }

  async getCategories(): Promise<ApiResponse<Category[]>> {
    return apiClient.get<Category[]>("/menu/categories");
  }

  async getMenuItems(params?: { categoryId?: string; search?: string }): Promise<ApiResponse<MenuItem[]>> {
    return apiClient.get<MenuItem[]>("/menu/items", { params });
  }

  async getMenuItemById(id: string): Promise<ApiResponse<MenuItem>> {
    return apiClient.get<MenuItem>(`/menu/items/${encodeURIComponent(id)}`);
  }

  async createMenuItem(item: Partial<MenuItem>): Promise<ApiResponse<MenuItem>> {
    return apiClient.post<MenuItem>("/menu/items", item);
  }

  async updateMenuItem(id: string, item: Partial<MenuItem>): Promise<ApiResponse<MenuItem>> {
    return apiClient.patch<MenuItem>(`/menu/items/${encodeURIComponent(id)}`, item);
  }

  async deleteMenuItem(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete<void>(`/menu/items/${encodeURIComponent(id)}`);
  }
}
