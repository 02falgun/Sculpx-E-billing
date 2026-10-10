import { Prisma, Dietary, SpiceLevel } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";

// Helper to slugify a category name
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Helper to normalize dietary input to Prisma enum
function mapDietary(input?: string): Dietary | undefined {
  if (!input) return undefined;
  if (input === "EGG" || input === "CONTAINS_EGG") return Dietary.CONTAINS_EGG;
  if (input === "VEG") return Dietary.VEG;
  if (input === "NON_VEG") return Dietary.NON_VEG;
  if (input === "VEGAN") return Dietary.VEGAN;
  return undefined;
}

// Helper to serialize Decimal to clean JSON float
function decimalToNumber(d: Prisma.Decimal | null | undefined): number {
  if (!d) return 0;
  return Number(d.toString());
}

// Format Category entity to client contract
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

// Format MenuItem entity with nested modifier groups to client contract
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

export class MenuService {
  // ==========================================
  // Categories
  // ==========================================

  async listCategories(
    tenantId: string,
    filters: { isActive?: boolean; search?: string }
  ) {
    const where: Prisma.MenuCategoryWhereInput = {
      tenantId,
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { description: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const categories = await prisma.menuCategory.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    return categories.map(formatCategory);
  }

  async getCategoryById(tenantId: string, id: string) {
    const category = await prisma.menuCategory.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    if (!category) {
      throw new AppError("Menu category not found", 404, "CATEGORY_NOT_FOUND");
    }

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
    const category = await prisma.menuCategory.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        displayOrder: data.displayOrder ?? 0,
        isActive: data.isActive ?? true,
      },
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
    // Confirm existence and tenant ownership
    const existing = await prisma.menuCategory.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new AppError("Menu category not found", 404, "CATEGORY_NOT_FOUND");
    }

    const updated = await prisma.menuCategory.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.displayOrder !== undefined ? { displayOrder: data.displayOrder } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    return formatCategory(updated);
  }

  async deleteCategory(tenantId: string, id: string) {
    const existing = await prisma.menuCategory.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: { items: true },
        },
      },
    });

    if (!existing) {
      throw new AppError("Menu category not found", 404, "CATEGORY_NOT_FOUND");
    }

    // If category has existing menu items, soft-delete to maintain foreign key integrity
    if (existing._count.items > 0) {
      await prisma.menuCategory.update({
        where: { id },
        data: { isActive: false },
      });
      return { softDeleted: true, message: "Category deactivated due to associated items" };
    }

    // Otherwise, safe hard delete
    await prisma.menuCategory.delete({
      where: { id },
    });

    return { softDeleted: false, message: "Category permanently removed" };
  }

  // ==========================================
  // Menu Items
  // ==========================================

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
    const dietaryValue = mapDietary(filters.dietary || filters.dietaryType);

    const where: Prisma.MenuItemWhereInput = {
      category: {
        tenantId,
      },
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
      ...(filters.isAvailable !== undefined ? { isAvailable: filters.isAvailable } : {}),
      ...(dietaryValue ? { dietary: dietaryValue } : {}),
      ...(filters.spiceLevel ? { spiceLevel: filters.spiceLevel as SpiceLevel } : {}),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              { description: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const page = Math.max(1, filters.page);
    const limit = Math.min(100, Math.max(1, filters.limit));
    const skip = (page - 1) * limit;

    const [totalItems, items] = await Promise.all([
      prisma.menuItem.count({ where }),
      prisma.menuItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [filters.sortBy]: filters.sortOrder },
        include: {
          category: {
            select: { id: true, name: true },
          },
          modifierGroups: {
            include: {
              options: true,
            },
          },
        },
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
    const item = await prisma.menuItem.findFirst({
      where: {
        id,
        category: {
          tenantId,
        },
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
        modifierGroups: {
          include: {
            options: true,
          },
        },
      },
    });

    if (!item) {
      throw new AppError("Menu item not found", 404, "ITEM_NOT_FOUND");
    }

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
    // 1. Verify category exists and belongs to tenant
    const category = await prisma.menuCategory.findFirst({
      where: { id: data.categoryId, tenantId },
    });

    if (!category) {
      throw new AppError(
        "Invalid category: target category does not exist or belongs to another organization",
        400,
        "INVALID_CATEGORY"
      );
    }

    const dietaryValue = mapDietary(data.dietary || data.dietaryType);

    // 2. Atomic creation of item and optional modifier groups/options
    const createdItem = await prisma.$transaction(async (tx) => {
      const item = await tx.menuItem.create({
        data: {
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
      });

      if (data.modifierGroups && data.modifierGroups.length > 0) {
        for (const mg of data.modifierGroups) {
          const group = await tx.modifierGroup.create({
            data: {
              menuItemId: item.id,
              name: mg.name,
              isRequired: mg.isRequired ?? false,
              minSelections: mg.minSelections ?? 0,
              maxSelections: mg.maxSelections ?? 1,
            },
          });

          if (mg.options && mg.options.length > 0) {
            await tx.modifierOption.createMany({
              data: mg.options.map((opt) => ({
                groupId: group.id,
                name: opt.name,
                price: new Prisma.Decimal(opt.price ?? 0),
              })),
            });
          }
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
    // 1. Verify item exists and belongs to tenant
    const existing = await prisma.menuItem.findFirst({
      where: {
        id,
        category: { tenantId },
      },
    });

    if (!existing) {
      throw new AppError("Menu item not found", 404, "ITEM_NOT_FOUND");
    }

    // 2. If category is being modified, verify target category belongs to tenant
    if (data.categoryId && data.categoryId !== existing.categoryId) {
      const newCategory = await prisma.menuCategory.findFirst({
        where: { id: data.categoryId, tenantId },
      });
      if (!newCategory) {
        throw new AppError(
          "Invalid category: target category does not exist or belongs to another organization",
          400,
          "INVALID_CATEGORY"
        );
      }
    }

    const dietaryValue = mapDietary(data.dietary || data.dietaryType);

    await prisma.menuItem.update({
      where: { id },
      data: {
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
      },
    });

    return this.getMenuItemById(tenantId, id);
  }

  async deleteMenuItem(tenantId: string, id: string) {
    const existing = await prisma.menuItem.findFirst({
      where: {
        id,
        category: { tenantId },
      },
      include: {
        _count: {
          select: {
            orderItems: true,
            billItems: true,
          },
        },
      },
    });

    if (!existing) {
      throw new AppError("Menu item not found", 404, "ITEM_NOT_FOUND");
    }

    // If item is referenced in historical orders or bills, soft-deactivate to preserve audit trail
    if (existing._count.orderItems > 0 || existing._count.billItems > 0) {
      await prisma.menuItem.update({
        where: { id },
        data: { isAvailable: false },
      });
      return { softDeleted: true, message: "Menu item deactivated due to historical order references" };
    }

    // Otherwise, safe delete
    await prisma.menuItem.delete({
      where: { id },
    });

    return { softDeleted: false, message: "Menu item permanently deleted" };
  }

  // ==========================================
  // Modifier Groups & Options Sub-Endpoints
  // ==========================================

  async listModifierGroups(tenantId: string, menuItemId: string) {
    // Verify item belongs to tenant
    await this.getMenuItemById(tenantId, menuItemId);

    const groups = await prisma.modifierGroup.findMany({
      where: { menuItemId },
      include: { options: true },
      orderBy: { name: "asc" },
    });

    return groups.map((g) => ({
      id: g.id,
      menuItemId: g.menuItemId,
      name: g.name,
      isRequired: g.isRequired,
      minSelections: g.minSelections,
      maxSelections: g.maxSelections,
      options: g.options.map((opt) => ({
        id: opt.id,
        name: opt.name,
        price: decimalToNumber(opt.price),
      })),
    }));
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

    const group = await prisma.modifierGroup.create({
      data: {
        menuItemId,
        name: data.name,
        isRequired: data.isRequired ?? false,
        minSelections: data.minSelections ?? 0,
        maxSelections: data.maxSelections ?? 1,
      },
      include: { options: true },
    });

    return {
      id: group.id,
      menuItemId: group.menuItemId,
      name: group.name,
      isRequired: group.isRequired,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      options: [],
    };
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
    const group = await prisma.modifierGroup.findFirst({
      where: {
        id: groupId,
        menuItem: {
          category: { tenantId },
        },
      },
    });

    if (!group) {
      throw new AppError("Modifier group not found", 404, "MODIFIER_GROUP_NOT_FOUND");
    }

    const updated = await prisma.modifierGroup.update({
      where: { id: groupId },
      data,
      include: { options: true },
    });

    return {
      id: updated.id,
      menuItemId: updated.menuItemId,
      name: updated.name,
      isRequired: updated.isRequired,
      minSelections: updated.minSelections,
      maxSelections: updated.maxSelections,
      options: updated.options.map((opt) => ({
        id: opt.id,
        name: opt.name,
        price: decimalToNumber(opt.price),
      })),
    };
  }

  async deleteModifierGroup(tenantId: string, groupId: string) {
    const group = await prisma.modifierGroup.findFirst({
      where: {
        id: groupId,
        menuItem: {
          category: { tenantId },
        },
      },
    });

    if (!group) {
      throw new AppError("Modifier group not found", 404, "MODIFIER_GROUP_NOT_FOUND");
    }

    await prisma.modifierGroup.delete({
      where: { id: groupId },
    });

    return { message: "Modifier group deleted" };
  }

  async createModifierOption(
    tenantId: string,
    groupId: string,
    data: { name: string; price?: number }
  ) {
    const group = await prisma.modifierGroup.findFirst({
      where: {
        id: groupId,
        menuItem: {
          category: { tenantId },
        },
      },
    });

    if (!group) {
      throw new AppError("Modifier group not found", 404, "MODIFIER_GROUP_NOT_FOUND");
    }

    const option = await prisma.modifierOption.create({
      data: {
        groupId,
        name: data.name,
        price: new Prisma.Decimal(data.price ?? 0),
      },
    });

    return {
      id: option.id,
      groupId: option.groupId,
      name: option.name,
      price: decimalToNumber(option.price),
    };
  }

  async updateModifierOption(
    tenantId: string,
    optionId: string,
    data: { name?: string; price?: number }
  ) {
    const option = await prisma.modifierOption.findFirst({
      where: {
        id: optionId,
        group: {
          menuItem: {
            category: { tenantId },
          },
        },
      },
    });

    if (!option) {
      throw new AppError("Modifier option not found", 404, "MODIFIER_OPTION_NOT_FOUND");
    }

    const updated = await prisma.modifierOption.update({
      where: { id: optionId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.price !== undefined ? { price: new Prisma.Decimal(data.price) } : {}),
      },
    });

    return {
      id: updated.id,
      groupId: updated.groupId,
      name: updated.name,
      price: decimalToNumber(updated.price),
    };
  }

  async deleteModifierOption(tenantId: string, optionId: string) {
    const option = await prisma.modifierOption.findFirst({
      where: {
        id: optionId,
        group: {
          menuItem: {
            category: { tenantId },
          },
        },
      },
    });

    if (!option) {
      throw new AppError("Modifier option not found", 404, "MODIFIER_OPTION_NOT_FOUND");
    }

    await prisma.modifierOption.delete({
      where: { id: optionId },
    });

    return { message: "Modifier option deleted" };
  }
}

export const menuService = new MenuService();
