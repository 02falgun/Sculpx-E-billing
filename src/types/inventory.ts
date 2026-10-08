import { ID, Timestamped } from "./common";

export type InventoryUnit = "KG" | "GRAM" | "LITRE" | "ML" | "PIECE" | "PACKET" | "CAN";

export type TransactionType = "RESTOCK" | "USAGE" | "WASTAGE" | "RETURN" | "ADJUSTMENT";

export interface InventoryItem extends Timestamped {
  id: ID;
  name: string;
  sku: string;
  category: string;
  unit: InventoryUnit;
  currentStock: number;
  minimumThreshold: number;
  idealStock: number;
  unitCost: number;
  isLowStock: boolean;
  supplierName?: string;
  lastRestockedAt?: string;
}

export interface RecipeIngredient {
  inventoryItemId: ID;
  inventoryItemName: string;
  quantityRequired: number;
  unit: InventoryUnit;
}

export interface Recipe extends Timestamped {
  id: ID;
  menuItemId: ID;
  menuItemName: string;
  ingredients: RecipeIngredient[];
}

export interface InventoryTransaction extends Timestamped {
  id: ID;
  inventoryItemId: ID;
  inventoryItemName: string;
  type: TransactionType;
  quantityChange: number;
  remainingStockAfter: number;
  reason?: string;
  performedBy: string;
  referenceOrderId?: ID;
}
