import type { Prisma } from "@prisma/client";

export interface InventoryItemFilters {
  category?: string;
  search?: string;
}

export interface InventoryTransactionFilters {
  itemId?: string;
  type?: string;
}

export type InventoryTransactionWithItem = Prisma.InventoryTransactionGetPayload<{
  include: { inventoryItem: true };
}>;

export type RecipeWithDetails = Prisma.RecipeGetPayload<{
  include: { menuItem: true; ingredients: { include: { inventoryItem: true } } };
}>;

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}
