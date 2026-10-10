import { z } from "zod";

export const uuidSchema = z.string().uuid("Invalid UUID format");

export const idParamSchema = z.object({
  id: uuidSchema,
});

export const itemParamSchema = z.object({
  itemId: uuidSchema,
});

export const groupParamSchema = z.object({
  groupId: uuidSchema,
});

export const optionParamSchema = z.object({
  optionId: uuidSchema,
});

// Category schemas
export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required").max(255),
  description: z.string().trim().max(1000).optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = createCategorySchema.partial();

export const categoryListQuerySchema = z.object({
  isActive: z
    .string()
    .transform((val) => val === "true" || val === "1")
    .optional(),
  search: z.string().trim().optional(),
});

// Helper to normalize dietary enum
export const dietaryEnum = z.enum(["VEG", "NON_VEG", "VEGAN", "CONTAINS_EGG"]);
export const dietaryInputEnum = z.enum(["VEG", "NON_VEG", "VEGAN", "EGG", "CONTAINS_EGG"]);

// Helper to normalize spiceLevel enum
export const spiceLevelEnum = z.enum(["NONE", "MILD", "MEDIUM", "HOT", "EXTRA_HOT"]);

// Nested modifier option schema
export const nestedModifierOptionSchema = z.object({
  name: z.string().trim().min(1, "Modifier option name is required").max(255),
  price: z.coerce.number().min(0, "Price must be non-negative").default(0),
});

// Nested modifier group schema
export const nestedModifierGroupSchema = z.object({
  name: z.string().trim().min(1, "Modifier group name is required").max(255),
  isRequired: z.boolean().default(false),
  minSelections: z.coerce.number().int().min(0).default(0),
  maxSelections: z.coerce.number().int().min(1).default(1),
  options: z.array(nestedModifierOptionSchema).default([]),
});

// Menu Item schemas
export const createMenuItemSchema = z.object({
  categoryId: uuidSchema,
  name: z.string().trim().min(1, "Item name is required").max(255),
  description: z.string().trim().max(2000).optional(),
  price: z.coerce.number().min(0, "Item price must be non-negative"),
  isAvailable: z.boolean().default(true),
  dietary: dietaryInputEnum.optional(),
  dietaryType: dietaryInputEnum.optional(),
  spiceLevel: z
    .union([
      spiceLevelEnum,
      z.literal(0).transform(() => "NONE" as const),
      z.literal(1).transform(() => "MILD" as const),
      z.literal(2).transform(() => "MEDIUM" as const),
      z.literal(3).transform(() => "HOT" as const),
    ])
    .optional(),
  preparationTimeMinutes: z.coerce.number().int().min(0).max(180).default(15),
  taxRatePercentage: z.coerce.number().min(0).max(100).default(5.0),
  modifierGroups: z.array(nestedModifierGroupSchema).optional(),
});

export const updateMenuItemSchema = z.object({
  categoryId: uuidSchema.optional(),
  name: z.string().trim().min(1, "Item name is required").max(255).optional(),
  description: z.string().trim().max(2000).optional(),
  price: z.coerce.number().min(0, "Item price must be non-negative").optional(),
  isAvailable: z.boolean().optional(),
  dietary: dietaryInputEnum.optional(),
  dietaryType: dietaryInputEnum.optional(),
  spiceLevel: z
    .union([
      spiceLevelEnum,
      z.literal(0).transform(() => "NONE" as const),
      z.literal(1).transform(() => "MILD" as const),
      z.literal(2).transform(() => "MEDIUM" as const),
      z.literal(3).transform(() => "HOT" as const),
    ])
    .optional(),
  preparationTimeMinutes: z.coerce.number().int().min(0).max(180).optional(),
  taxRatePercentage: z.coerce.number().min(0).max(100).optional(),
});

export const menuItemListQuerySchema = z.object({
  categoryId: uuidSchema.optional(),
  isAvailable: z
    .string()
    .transform((val) => val === "true" || val === "1")
    .optional(),
  dietary: dietaryInputEnum.optional(),
  spiceLevel: spiceLevelEnum.optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  sortBy: z.enum(["name", "price", "createdAt"]).default("name"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
});

// Dedicated Modifier Group CRUD Schemas
export const createModifierGroupSchema = z.object({
  name: z.string().trim().min(1, "Modifier group name is required").max(255),
  isRequired: z.boolean().default(false),
  minSelections: z.coerce.number().int().min(0).default(0),
  maxSelections: z.coerce.number().int().min(1).default(1),
});

export const updateModifierGroupSchema = createModifierGroupSchema.partial();

// Dedicated Modifier Option CRUD Schemas
export const createModifierOptionSchema = z.object({
  name: z.string().trim().min(1, "Modifier option name is required").max(255),
  price: z.coerce.number().min(0, "Modifier price must be non-negative").default(0),
});

export const updateModifierOptionSchema = createModifierOptionSchema.partial();
