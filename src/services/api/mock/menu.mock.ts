import { IMenuService } from "../interfaces";
import { ApiResponse, Category, MenuItem, QRContext } from "@/types";
import {
  MOCK_CATEGORIES,
  MOCK_MENU_ITEMS,
  MOCK_QR_CONTEXTS,
} from "@/mocks/mockDb";

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockMenuService implements IMenuService {
  private categories: Category[] = [...MOCK_CATEGORIES];
  private items: MenuItem[] = [...MOCK_MENU_ITEMS];
  private contexts: Record<string, QRContext> = { ...MOCK_QR_CONTEXTS };

  async getContextByQrToken(qrToken: string): Promise<ApiResponse<QRContext>> {
    await delay(100);
    const context = this.contexts[qrToken];
    if (!context) {
      return {
        success: false,
        data: null as unknown as QRContext,
        error: {
          code: "QR_TOKEN_INVALID",
          message: "Invalid or expired QR code. Please scan an active table or room code.",
        },
      };
    }
    return { success: true, data: context };
  }

  async getCategories(): Promise<ApiResponse<Category[]>> {
    await delay(100);
    return { success: true, data: this.categories.filter((c) => c.isActive) };
  }

  async getMenuItems(params?: {
    categoryId?: string;
    search?: string;
  }): Promise<ApiResponse<MenuItem[]>> {
    await delay(150);
    let filtered = [...this.items];

    if (params?.categoryId) {
      filtered = filtered.filter((i) => i.categoryId === params.categoryId);
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.categoryName?.toLowerCase().includes(q),
      );
    }

    return { success: true, data: filtered };
  }

  async getMenuItemById(id: string): Promise<ApiResponse<MenuItem>> {
    await delay(100);
    const item = this.items.find((i) => i.id === id);
    if (!item) {
      return {
        success: false,
        data: null as unknown as MenuItem,
        error: { code: "ITEM_NOT_FOUND", message: "Item not found" },
      };
    }
    return { success: true, data: item };
  }

  async createMenuItem(item: Partial<MenuItem>): Promise<ApiResponse<MenuItem>> {
    await delay(200);
    const newItem: MenuItem = {
      id: `item-${Date.now()}`,
      categoryId: item.categoryId || "cat-starters",
      categoryName: item.categoryName || "Starters",
      name: item.name || "New Dish",
      description: item.description || "",
      price: item.price || 100,
      preparationTimeMinutes: item.preparationTimeMinutes || 15,
      dietaryType: item.dietaryType || "VEG",
      isAvailable: item.isAvailable ?? true,
      taxRatePercentage: item.taxRatePercentage || 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...item,
    };
    this.items.push(newItem);
    return { success: true, data: newItem, message: "Item created" };
  }

  async updateMenuItem(id: string, updates: Partial<MenuItem>): Promise<ApiResponse<MenuItem>> {
    await delay(150);
    const index = this.items.findIndex((i) => i.id === id);
    if (index === -1) {
      return {
        success: false,
        data: null as unknown as MenuItem,
        error: { code: "ITEM_NOT_FOUND", message: "Item not found" },
      };
    }
    this.items[index] = {
      ...this.items[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    return { success: true, data: this.items[index], message: "Item updated" };
  }

  async deleteMenuItem(id: string): Promise<ApiResponse<void>> {
    await delay(150);
    this.items = this.items.filter((i) => i.id !== id);
    return { success: true, data: undefined, message: "Item deleted" };
  }
}
