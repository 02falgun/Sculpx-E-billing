/**
 * SCULPX E-Billing — Inventory & Recipe BOM API Contracts
 */

import { ID } from "../common";
import {
  InventoryItem,
  InventoryUnit,
  InventoryTransaction,
  Recipe,
  RecipeIngredient,
  TransactionType,
} from "../inventory";
import { ApiPaginationQueryParams } from "./common.api";

export interface InventoryListQueryParams extends ApiPaginationQueryParams {
  isLowStock?: boolean;
  category?: string;
  search?: string;
}

export interface CreateInventoryItemRequestBody {
  name: string;
  sku: string;
  category: string;
  unit: InventoryUnit;
  currentStock: number;
  minimumThreshold: number;
  idealStock: number;
  unitCost: number;
  supplierName?: string;
}

export interface UpdateInventoryItemRequestBody extends Partial<CreateInventoryItemRequestBody> {}

export interface RecordStockAdjustmentRequestBody {
  itemId: ID;
  quantityChange: number; // positive for RESTOCK, negative for USAGE/WASTAGE
  type: TransactionType;
  reason: string;
  referenceOrderId?: ID;
}

export interface InventoryTransactionListQueryParams extends ApiPaginationQueryParams {
  itemId?: ID;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
}

export interface CreateRecipeRequestBody {
  menuItemId: ID;
  ingredients: Omit<RecipeIngredient, "inventoryItemName">[];
}

export interface UpdateRecipeRequestBody {
  ingredients: Omit<RecipeIngredient, "inventoryItemName">[];
}
