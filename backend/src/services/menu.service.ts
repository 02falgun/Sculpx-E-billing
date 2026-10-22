import { Prisma, Dietary, SpiceLevel } from "@prisma/client";
import { withTransaction } from "../database/prisma.js";
import { BadRequestError } from "../lib/errors.js";
import { ErrorCode } from "../constants/error-codes.js";
import { ensureFound } from "../lib/guards.js";
import { menuCategoryModel, menuItemModel, modifierModel } from "../models/menu.model.js";
import type { CategoryFilters } from "../types/menu.types.js";

/** URL-friendly slug derived from a category name. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Map API dietary input (which also accepts "EGG") to the Prisma enum. */
function mapDietary(input?: string): Dietary | undefined {
  if (!input) return undefined;
  if (input === "EGG" || input === "CONTAINS_EGG") return Dietary.CONTAINS_EGG;
  if (input === "VEG") return Dietary.VEG;
  if (input === "NON_VEG") return Dietary.NON_VEG;
  if (input === "VEGAN") return Dietary.VEGAN;
  return undefined;
}

function decimalToNumber(d: Prisma.Decimal | null | undefined): number {
  if (!d) return 0;
  return Number(d.toString());
}

export function formatCategory(category: {
  id: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: Date;
  _count?: { items: number };
}) {
  return {
    id: category.id,
    name: category.name,
    slug: slugify(category.name),
    description: category.description || undefined,
    displayOrder: category.displayOrder,
    isActive: category.isActive,
    itemCount: category._count?.items ?? 0,
    createdAt: category.createdAt.toISOString(),
  };
}

export function formatMenuItem(item: {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  price: Prisma.Decimal;
  isAvailable: boolean;
  dietary: Dietary | null;
  spiceLevel: SpiceLevel | null;
  preparationTimeMinutes: number | null;
  taxRatePercentage: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
  category?: { id: string; name: string } | null;
  modifierGroups?: Array<{
    id: string;
    name: string;
    isRequired: boolean;
    minSelections: number;
    maxSelections: number;
    options: Array<{
      id: string;
      name: string;
      price: Prisma.Decimal;
    }>;
  }>;
}) {
  const dietaryType = item.dietary === "CONTAINS_EGG" ? "EGG" : item.dietary;

  return {
    id: item.id,
    categoryId: item.categoryId,
    categoryName: item.category?.name,
    name: item.name,
    description: item.description || "",
    price: decimalToNumber(item.price),
    isAvailable: item.isAvailable,
    dietary: item.dietary,
    dietaryType: dietaryType || undefined,
    spiceLevel: item.spiceLevel,
    preparationTimeMinutes: item.preparationTimeMinutes ?? 15,
    taxRatePercentage: decimalToNumber(item.taxRatePercentage),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    modifierGroups: item.modifierGroups?.map((group) => ({
      id: group.id,
      name: group.name,
      isRequired: group.isRequired,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      modifiers: group.options.map((opt) => ({
        id: opt.id,
        name: opt.name,
        price: decimalToNumber(opt.price),
        isAvailable: true,
      })),
      options: group.options.map((opt) => ({
        id: opt.id,
        name: opt.name,
        price: decimalToNumber(opt.price),
      })),
    })),
  };
}

function ensureCategory<T>(category: T | null | undefined): T {
  return ensureFound(category, "Menu category not found", ErrorCode.CATEGORY_NOT_FOUND);
}

function ensureMenuItem<T>(item: T | null | undefined): T {
  return ensureFound(item, "Menu item not found", ErrorCode.ITEM_NOT_FOUND);
}

async function assertValidCategory(tenantId: string, categoryId: string): Promise<void> {
  const category = await menuCategoryModel.findByIdInTenant(categoryId, tenantId);
  if (!category) {
    throw new BadRequestError("Invalid category: target category does not exist or belongs to another organization", ErrorCode.INVALID_CATEGORY);
  }
}

async function getOwnedModifierGroup(tenantId: string, groupId: string) {
  return ensureFound(
    await modifierModel.findGroupByIdInTenant(groupId, tenantId),
    "Modifier group not found",
    ErrorCode.MODIFIER_GROUP_NOT_FOUND
  );
}

async function getOwnedModifierOption(tenantId: string, optionId: string) {
  return ensureFound(
    await modifierModel.findOptionByIdInTenant(optionId, tenantId),
    "Modifier option not found",
    ErrorCode.MODIFIER_OPTION_NOT_FOUND
  );
}

function formatModifierGroup(group: {
  id: string;
  menuItemId: string;
  name: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  options: Array<{ id: string; name: string; price: Prisma.Decimal }>;
}) {
  return {
    id: group.id,
    menuItemId: group.menuItemId,
    name: group.name,
    isRequired: group.isRequired,
    minSelections: group.minSelections,
    maxSelections: group.maxSelections,
    options: group.options.map((opt) => ({
      id: opt.id,
      name: opt.name,
      price: decimalToNumber(opt.price),
    })),
  };
}

function formatModifierOption(option: {
  id: string;
  groupId: string;
  name: string;
  price: Prisma.Decimal;
}) {
  return {
    id: option.id,
    groupId: option.groupId,
    name: option.name,
    price: decimalToNumber(option.price),
  };
}

export class MenuService {
  // Categories

  async listCategories(tenantId: string, filters: CategoryFilters) {
    const categories = await menuCategoryModel.findManyForTenant(tenantId, filters);
    return categories.map(formatCategory);
  }

  async getCategoryById(tenantId: string, id: string) {
    const category = ensureCategory(
      await menuCategoryModel.findByIdInTenantWithItemCount(id, tenantId)
    );
    return formatCategory(category);
  }

  async createCategory(
    tenantId: string,
    data: {
      name: string;
      description?: string;
      displayOrder?: number;
      isActive?: boolean;
    }
  ) {
    const category = await menuCategoryModel.create({
      tenantId,
      name: data.name,
      description: data.description,
      displayOrder: data.displayOrder ?? 0,
      isActive: data.isActive ?? true,
    });

    return formatCategory(category);
  }

  async updateCategory(
    tenantId: string,
    id: string,
    data: {
      name?: string;
      description?: string;
      displayOrder?: number;
      isActive?: boolean;
    }
  ) {
    ensureCategory(await menuCategoryModel.findByIdInTenant(id, tenantId));

    const updated = await menuCategoryModel.updateWithItemCount(id, {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.displayOrder !== undefined ? { displayOrder: data.displayOrder } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    });

    return formatCategory(updated);
  }

  async deleteCategory(tenantId: string, id: string) {
    const existing = ensureCategory(
      await menuCategoryModel.findByIdInTenantWithItemCount(id, tenantId)
    );

    // Soft-delete categories that still have items to keep foreign keys intact
    if (existing._count.items > 0) {
      await menuCategoryModel.update(id, { isActive: false });
      return { softDeleted: true, message: "Category deactivated due to associated items" };
    }

    await menuCategoryModel.delete(id);
    return { softDeleted: false, message: "Category permanently removed" };
  }

  // Menu items

  async listMenuItems(
    tenantId: string,
    filters: {
      categoryId?: string;
      isAvailable?: boolean;
      dietary?: string;
      dietaryType?: string;
      spiceLevel?: string;
      search?: string;
      page: number;
      limit: number;
      sortBy: "name" | "price" | "createdAt";
      sortOrder: "asc" | "desc";
    }
  ) {
    const itemFilters = {
      categoryId: filters.categoryId,
      isAvailable: filters.isAvailable,
      dietary: mapDietary(filters.dietary || filters.dietaryType),
      spiceLevel: filters.spiceLevel,
      search: filters.search,
    };

    const page = Math.max(1, filters.page);
    const limit = Math.min(100, Math.max(1, filters.limit));
    const skip = (page - 1) * limit;

    const [totalItems, items] = await Promise.all([
      menuItemModel.countForTenant(tenantId, itemFilters),
      menuItemModel.findPageForTenant(tenantId, itemFilters, {
        skip,
        take: limit,
        orderBy: { [filters.sortBy]: filters.sortOrder },
      }),
    ]);

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      items: items.map(formatMenuItem),
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async getMenuItemById(tenantId: string, id: string) {
    const item = ensureMenuItem(await menuItemModel.findByIdInTenantWithDetails(id, tenantId));
    return formatMenuItem(item);
  }

  async createMenuItem(
    tenantId: string,
    data: {
      categoryId: string;
      name: string;
      description?: string;
      price: number;
      isAvailable?: boolean;
      dietary?: string;
      dietaryType?: string;
      spiceLevel?: string;
      preparationTimeMinutes?: number;
      taxRatePercentage?: number;
      modifierGroups?: Array<{
        name: string;
        isRequired?: boolean;
        minSelections?: number;
        maxSelections?: number;
        options: Array<{
          name: string;
          price?: number;
        }>;
      }>;
    }
  ) {
    await assertValidCategory(tenantId, data.categoryId);

    const dietaryValue = mapDietary(data.dietary || data.dietaryType);

    // Item and its modifier groups/options are created atomically
    const createdItem = await withTransaction(async (tx) => {
      const item = await menuItemModel.create(
        {
          categoryId: data.categoryId,
          name: data.name,
          description: data.description,
          price: new Prisma.Decimal(data.price),
          isAvailable: data.isAvailable ?? true,
          dietary: dietaryValue,
          spiceLevel: (data.spiceLevel as SpiceLevel) || null,
          preparationTimeMinutes: data.preparationTimeMinutes ?? 15,
          taxRatePercentage: new Prisma.Decimal(data.taxRatePercentage ?? 5.0),
        },
        tx
      );

      for (const mg of data.modifierGroups ?? []) {
        const group = await modifierModel.createGroup(
          {
            menuItemId: item.id,
            name: mg.name,
            isRequired: mg.isRequired ?? false,
            minSelections: mg.minSelections ?? 0,
            maxSelections: mg.maxSelections ?? 1,
          },
          tx
        );

        if (mg.options?.length) {
          await modifierModel.createOptions(
            mg.options.map((opt) => ({
              groupId: group.id,
              name: opt.name,
              price: new Prisma.Decimal(opt.price ?? 0),
            })),
            tx
          );
        }
      }

      return item;
    });

    return this.getMenuItemById(tenantId, createdItem.id);
  }

  async updateMenuItem(
    tenantId: string,
    id: string,
    data: {
      categoryId?: string;
      name?: string;
      description?: string;
      price?: number;
      isAvailable?: boolean;
      dietary?: string;
      dietaryType?: string;
      spiceLevel?: string;
      preparationTimeMinutes?: number;
      taxRatePercentage?: number;
    }
  ) {
    const existing = ensureMenuItem(await menuItemModel.findByIdInTenant(id, tenantId));

    if (data.categoryId && data.categoryId !== existing.categoryId) {
      await assertValidCategory(tenantId, data.categoryId);
    }

    const dietaryValue = mapDietary(data.dietary || data.dietaryType);

    await menuItemModel.update(id, {
      ...(data.categoryId ? { categoryId: data.categoryId } : {}),
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.price !== undefined ? { price: new Prisma.Decimal(data.price) } : {}),
      ...(data.isAvailable !== undefined ? { isAvailable: data.isAvailable } : {}),
      ...(dietaryValue !== undefined ? { dietary: dietaryValue } : {}),
      ...(data.spiceLevel !== undefined ? { spiceLevel: data.spiceLevel as SpiceLevel } : {}),
      ...(data.preparationTimeMinutes !== undefined
        ? { preparationTimeMinutes: data.preparationTimeMinutes }
        : {}),
      ...(data.taxRatePercentage !== undefined
        ? { taxRatePercentage: new Prisma.Decimal(data.taxRatePercentage) }
        : {}),
    });

    return this.getMenuItemById(tenantId, id);
  }

  async deleteMenuItem(tenantId: string, id: string) {
    const existing = ensureMenuItem(
      await menuItemModel.findByIdInTenantWithUsageCounts(id, tenantId)
    );

    // Items referenced by historical orders or bills are deactivated to preserve the audit trail
    if (existing._count.orderItems > 0 || existing._count.billItems > 0) {
      await menuItemModel.update(id, { isAvailable: false });
      return { softDeleted: true, message: "Menu item deactivated due to historical order references" };
    }

    await menuItemModel.delete(id);
    return { softDeleted: false, message: "Menu item permanently deleted" };
  }

  // Modifier groups & options

  async listModifierGroups(tenantId: string, menuItemId: string) {
    await this.getMenuItemById(tenantId, menuItemId);

    const groups = await modifierModel.findGroupsForMenuItem(menuItemId);
    return groups.map(formatModifierGroup);
  }

  async createModifierGroup(
    tenantId: string,
    menuItemId: string,
    data: {
      name: string;
      isRequired?: boolean;
      minSelections?: number;
      maxSelections?: number;
    }
  ) {
    await this.getMenuItemById(tenantId, menuItemId);

    const group = await modifierModel.createGroupWithOptions({
      menuItemId,
      name: data.name,
      isRequired: data.isRequired ?? false,
      minSelections: data.minSelections ?? 0,
      maxSelections: data.maxSelections ?? 1,
    });

    return { ...formatModifierGroup(group), options: [] };
  }

  async updateModifierGroup(
    tenantId: string,
    groupId: string,
    data: {
      name?: string;
      isRequired?: boolean;
      minSelections?: number;
      maxSelections?: number;
    }
  ) {
    await getOwnedModifierGroup(tenantId, groupId);

    const updated = await modifierModel.updateGroup(groupId, data);
    return formatModifierGroup(updated);
  }

  async deleteModifierGroup(tenantId: string, groupId: string) {
    await getOwnedModifierGroup(tenantId, groupId);

    await modifierModel.deleteGroup(groupId);
    return { message: "Modifier group deleted" };
  }

  async createModifierOption(
    tenantId: string,
    groupId: string,
    data: { name: string; price?: number }
  ) {
    await getOwnedModifierGroup(tenantId, groupId);

    const option = await modifierModel.createOption({
      groupId,
      name: data.name,
      price: new Prisma.Decimal(data.price ?? 0),
    });

    return formatModifierOption(option);
  }

  async updateModifierOption(
    tenantId: string,
    optionId: string,
    data: { name?: string; price?: number }
  ) {
    await getOwnedModifierOption(tenantId, optionId);

    const updated = await modifierModel.updateOption(optionId, {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.price !== undefined ? { price: new Prisma.Decimal(data.price) } : {}),
    });

    return formatModifierOption(updated);
  }

  async deleteModifierOption(tenantId: string, optionId: string) {
    await getOwnedModifierOption(tenantId, optionId);

    await modifierModel.deleteOption(optionId);
    return { message: "Modifier option deleted" };
  }
}

export const menuService = new MenuService();
