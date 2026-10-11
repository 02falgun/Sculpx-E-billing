import { z } from "zod";

export const InventoryUnitEnum = z.enum([
  "KG",
  "GRAM",
  "LITRE",
  "ML",
  "PIECE",
  "PACKET",
  "CAN",
  "PORTION",
  "BOTTLE",
]);

export const InventoryTransactionTypeEnum = z.enum([
  "RESTOCK",
  "USAGE",
  "WASTAGE",
  "ADJUSTMENT",
  "RETURN",
]);

export const CreateInventoryItemSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(255),
  sku: z.string().trim().min(1, "SKU is required").max(100),
  category: z.string().trim().min(1, "Category is required").max(100),
  unit: InventoryUnitEnum.default("KG"),
  currentStock: z.number().min(0, "Stock cannot be negative").default(0),
  minimumThreshold: z.number().min(0, "Threshold cannot be negative").default(0),
  idealStock: z.number().min(0).optional(),
  unitCost: z.number().min(0, "Unit cost cannot be negative").default(0),
  supplierName: z.string().max(255).optional(),
});

export const UpdateInventoryItemSchema = z.object({
  name: z.string().trim().min(1).max(255).optional(),
  sku: z.string().trim().min(1).max(100).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  unit: InventoryUnitEnum.optional(),
  minimumThreshold: z.number().min(0).optional(),
  idealStock: z.number().min(0).optional(),
  unitCost: z.number().min(0).optional(),
  supplierName: z.string().max(255).optional(),
  isActive: z.boolean().optional(),
});

export const StockAdjustmentSchema = z.object({
  itemId: z.string().uuid("Invalid item UUID"),
  quantityChange: z.number().refine((val) => val !== 0, "quantityChange must be non-zero"),
  type: InventoryTransactionTypeEnum,
  reason: z.string().trim().min(1, "Reason is required").max(500),
  referenceOrderId: z.string().uuid().optional(),
});

export const RecipeIngredientInputSchema = z.object({
  inventoryItemId: z.string().uuid("Invalid inventory item UUID"),
  quantityRequired: z.number().positive("Quantity required must be greater than 0"),
  unit: InventoryUnitEnum,
});

export const UpsertRecipeSchema = z.object({
  menuItemId: z.string().uuid("Invalid menu item UUID"),
  name: z.string().trim().min(1).max(255),
  ingredients: z
    .array(RecipeIngredientInputSchema)
    .min(1, "Recipe must contain at least one ingredient"),
});

export const QueryInventoryItemsSchema = z.object({
  isLowStock: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => (val === undefined ? undefined : val === "true")),
  category: z.string().optional(),
  search: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
});

export const QueryTransactionsSchema = z.object({
  itemId: z.string().uuid().optional(),
  type: InventoryTransactionTypeEnum.optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
});

export type CreateInventoryItemBody = z.infer<typeof CreateInventoryItemSchema>;
export type UpdateInventoryItemBody = z.infer<typeof UpdateInventoryItemSchema>;
export type StockAdjustmentBody = z.infer<typeof StockAdjustmentSchema>;
export type UpsertRecipeBody = z.infer<typeof UpsertRecipeSchema>;
export type QueryInventoryItemsParams = z.infer<typeof QueryInventoryItemsSchema>;
export type QueryTransactionsParams = z.infer<typeof QueryTransactionsSchema>;
