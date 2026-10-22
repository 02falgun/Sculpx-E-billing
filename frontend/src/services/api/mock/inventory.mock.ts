import { IInventoryService } from "../interfaces";
import {
  ApiResponse,
  InventoryItem,
  InventoryTransaction,
  PaginatedResult,
  PaginationParams,
  Recipe,
} from "@/types";
import {
  MOCK_INVENTORY,
  MOCK_INVENTORY_TRANSACTIONS,
  MOCK_RECIPES,
} from "@/mocks/mockDb";

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockInventoryService implements IInventoryService {
  private items: InventoryItem[] = [...MOCK_INVENTORY];
  private transactions: InventoryTransaction[] = [...MOCK_INVENTORY_TRANSACTIONS];
  private recipes: Recipe[] = [...MOCK_RECIPES];

  async getItems(params?: {
    isLowStock?: boolean;
    search?: string;
    pagination?: PaginationParams;
  }): Promise<ApiResponse<PaginatedResult<InventoryItem>>> {
    await delay(150);
    let filtered = [...this.items];

    if (params?.isLowStock !== undefined) {
      filtered = filtered.filter((i) => i.isLowStock === params.isLowStock);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (i) => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q),
      );
    }

    const page = params?.pagination?.page || 1;
    const limit = params?.pagination?.limit || 10;
    const total = filtered.length;
    const data = filtered.slice((page - 1) * limit, page * limit);

    return {
      success: true,
      data: {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getItemById(id: string): Promise<ApiResponse<InventoryItem>> {
    await delay(100);
    const item = this.items.find((i) => i.id === id);
    if (!item) {
      return {
        success: false,
        data: null as unknown as InventoryItem,
        error: { code: "ITEM_NOT_FOUND", message: "Inventory item not found" },
      };
    }
    return { success: true, data: item };
  }

  async getTransactions(params?: {
    itemId?: string;
    pagination?: PaginationParams;
  }): Promise<ApiResponse<PaginatedResult<InventoryTransaction>>> {
    await delay(150);
    let filtered = [...this.transactions];
    if (params?.itemId) {
      filtered = filtered.filter((t) => t.inventoryItemId === params.itemId);
    }
    const page = params?.pagination?.page || 1;
    const limit = params?.pagination?.limit || 10;
    const total = filtered.length;
    const data = filtered.slice((page - 1) * limit, page * limit);

    return {
      success: true,
      data: {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async recordStockAdjustment(
    itemId: string,
    quantityChange: number,
    reason: string,
    type: "RESTOCK" | "USAGE" | "WASTAGE" | "ADJUSTMENT",
  ): Promise<ApiResponse<InventoryTransaction>> {
    await delay(200);
    const item = this.items.find((i) => i.id === itemId);
    if (!item) {
      return {
        success: false,
        data: null as unknown as InventoryTransaction,
        error: { code: "ITEM_NOT_FOUND", message: "Item not found" },
      };
    }

    item.currentStock += quantityChange;
    item.isLowStock = item.currentStock <= item.minimumThreshold;
    item.updatedAt = new Date().toISOString();

    const tx: InventoryTransaction = {
      id: `tx-${Date.now()}`,
      inventoryItemId: item.id,
      inventoryItemName: item.name,
      type,
      quantityChange,
      remainingStockAfter: item.currentStock,
      reason,
      performedBy: "Store Manager",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.transactions.unshift(tx);
    return { success: true, data: tx, message: "Inventory transaction recorded" };
  }

  async getRecipes(): Promise<ApiResponse<Recipe[]>> {
    await delay(100);
    return { success: true, data: this.recipes };
  }
}
