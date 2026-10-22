import { IInventoryService } from "../interfaces";
import {
  ApiResponse,
  InventoryItem,
  InventoryTransaction,
  PaginatedResult,
  PaginationParams,
  Recipe,
} from "@/types";
import { apiClient } from "../client";

export class HttpInventoryService implements IInventoryService {
  async getItems(params?: {
    isLowStock?: boolean;
    search?: string;
    pagination?: PaginationParams;
  }): Promise<ApiResponse<PaginatedResult<InventoryItem>>> {
    return apiClient.get<PaginatedResult<InventoryItem>>("/inventory/items", {
      params: {
        isLowStock: params?.isLowStock,
        search: params?.search,
        page: params?.pagination?.page,
        limit: params?.pagination?.limit,
      },
    });
  }

  async getItemById(id: string): Promise<ApiResponse<InventoryItem>> {
    return apiClient.get<InventoryItem>(`/inventory/items/${encodeURIComponent(id)}`);
  }

  async getTransactions(params?: {
    itemId?: string;
    pagination?: PaginationParams;
  }): Promise<ApiResponse<PaginatedResult<InventoryTransaction>>> {
    return apiClient.get<PaginatedResult<InventoryTransaction>>("/inventory/transactions", {
      params: {
        itemId: params?.itemId,
        page: params?.pagination?.page,
        limit: params?.pagination?.limit,
      },
    });
  }

  async recordStockAdjustment(
    itemId: string,
    quantityChange: number,
    reason: string,
    type: "RESTOCK" | "USAGE" | "WASTAGE" | "ADJUSTMENT",
  ): Promise<ApiResponse<InventoryTransaction>> {
    return apiClient.post<InventoryTransaction>("/inventory/adjustments", {
      itemId,
      quantityChange,
      reason,
      type,
    });
  }

  async getRecipes(): Promise<ApiResponse<Recipe[]>> {
    return apiClient.get<Recipe[]>("/inventory/recipes");
  }
}
