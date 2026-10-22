import type { Prisma, SpiceLevel } from "@prisma/client";
import { prisma, type DbClient } from "../database/prisma.js";
import type { CategoryFilters, MenuItemFilters } from "../types/menu.types.js";

const withItemCount = {
  _count: {
    select: { items: true },
  },
} satisfies Prisma.MenuCategoryInclude;

const menuItemDetails = {
  category: {
    select: { id: true, name: true },
  },
  modifierGroups: {
    include: {
      options: true,
    },
  },
} satisfies Prisma.MenuItemInclude;

const modifierGroupInTenant = (tenantId: string): Prisma.ModifierGroupWhereInput => ({
  menuItem: {
    category: { tenantId },
  },
});

function categoryWhere(tenantId: string, filters: CategoryFilters): Prisma.MenuCategoryWhereInput {
  return {
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
}

function menuItemWhere(tenantId: string, filters: MenuItemFilters): Prisma.MenuItemWhereInput {
  return {
    category: {
      tenantId,
    },
    ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    ...(filters.isAvailable !== undefined ? { isAvailable: filters.isAvailable } : {}),
    ...(filters.dietary ? { dietary: filters.dietary } : {}),
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
}

export const menuCategoryModel = {
  findManyForTenant(tenantId: string, filters: CategoryFilters, db: DbClient = prisma) {
    return db.menuCategory.findMany({
      where: categoryWhere(tenantId, filters),
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: withItemCount,
    });
  },

  findByIdInTenant(id: string, tenantId: string, db: DbClient = prisma) {
    return db.menuCategory.findFirst({ where: { id, tenantId } });
  },

  findByIdInTenantWithItemCount(id: string, tenantId: string, db: DbClient = prisma) {
    return db.menuCategory.findFirst({ where: { id, tenantId }, include: withItemCount });
  },

  create(data: Prisma.MenuCategoryUncheckedCreateInput, db: DbClient = prisma) {
    return db.menuCategory.create({ data });
  },

  update(id: string, data: Prisma.MenuCategoryUncheckedUpdateInput, db: DbClient = prisma) {
    return db.menuCategory.update({ where: { id }, data });
  },

  updateWithItemCount(
    id: string,
    data: Prisma.MenuCategoryUncheckedUpdateInput,
    db: DbClient = prisma
  ) {
    return db.menuCategory.update({ where: { id }, data, include: withItemCount });
  },

  delete(id: string, db: DbClient = prisma) {
    return db.menuCategory.delete({ where: { id } });
  },
};

export const menuItemModel = {
  countForTenant(tenantId: string, filters: MenuItemFilters, db: DbClient = prisma) {
    return db.menuItem.count({ where: menuItemWhere(tenantId, filters) });
  },

  findPageForTenant(
    tenantId: string,
    filters: MenuItemFilters,
    page: { skip: number; take: number; orderBy: Prisma.MenuItemOrderByWithRelationInput },
    db: DbClient = prisma
  ) {
    return db.menuItem.findMany({
      where: menuItemWhere(tenantId, filters),
      skip: page.skip,
      take: page.take,
      orderBy: page.orderBy,
      include: menuItemDetails,
    });
  },

  findByIdInTenant(id: string, tenantId: string, db: DbClient = prisma) {
    return db.menuItem.findFirst({ where: { id, category: { tenantId } } });
  },

  findByIdInTenantWithDetails(id: string, tenantId: string, db: DbClient = prisma) {
    return db.menuItem.findFirst({
      where: { id, category: { tenantId } },
      include: menuItemDetails,
    });
  },

  findByIdInTenantWithUsageCounts(id: string, tenantId: string, db: DbClient = prisma) {
    return db.menuItem.findFirst({
      where: { id, category: { tenantId } },
      include: {
        _count: {
          select: {
            orderItems: true,
            billItems: true,
          },
        },
      },
    });
  },

  /** Menu items (with modifier groups and options) scoped to a tenant, for cart pricing. */
  findManyForPricing(tenantId: string, menuItemIds: string[], db: DbClient = prisma) {
    return db.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        category: { tenantId },
      },
      include: {
        modifierGroups: { include: { options: true } },
      },
    });
  },

  create(data: Prisma.MenuItemUncheckedCreateInput, db: DbClient = prisma) {
    return db.menuItem.create({ data });
  },

  update(id: string, data: Prisma.MenuItemUncheckedUpdateInput, db: DbClient = prisma) {
    return db.menuItem.update({ where: { id }, data });
  },

  delete(id: string, db: DbClient = prisma) {
    return db.menuItem.delete({ where: { id } });
  },
};

export const modifierModel = {
  findGroupsForMenuItem(menuItemId: string, db: DbClient = prisma) {
    return db.modifierGroup.findMany({
      where: { menuItemId },
      include: { options: true },
      orderBy: { name: "asc" },
    });
  },

  findGroupByIdInTenant(groupId: string, tenantId: string, db: DbClient = prisma) {
    return db.modifierGroup.findFirst({
      where: { id: groupId, ...modifierGroupInTenant(tenantId) },
    });
  },

  createGroup(data: Prisma.ModifierGroupUncheckedCreateInput, db: DbClient = prisma) {
    return db.modifierGroup.create({ data });
  },

  createGroupWithOptions(data: Prisma.ModifierGroupUncheckedCreateInput, db: DbClient = prisma) {
    return db.modifierGroup.create({ data, include: { options: true } });
  },

  updateGroup(id: string, data: Prisma.ModifierGroupUncheckedUpdateInput, db: DbClient = prisma) {
    return db.modifierGroup.update({ where: { id }, data, include: { options: true } });
  },

  deleteGroup(id: string, db: DbClient = prisma) {
    return db.modifierGroup.delete({ where: { id } });
  },

  findOptionByIdInTenant(optionId: string, tenantId: string, db: DbClient = prisma) {
    return db.modifierOption.findFirst({
      where: { id: optionId, group: modifierGroupInTenant(tenantId) },
    });
  },

  createOption(data: Prisma.ModifierOptionUncheckedCreateInput, db: DbClient = prisma) {
    return db.modifierOption.create({ data });
  },

  createOptions(data: Prisma.ModifierOptionCreateManyInput[], db: DbClient = prisma) {
    return db.modifierOption.createMany({ data });
  },

  updateOption(id: string, data: Prisma.ModifierOptionUncheckedUpdateInput, db: DbClient = prisma) {
    return db.modifierOption.update({ where: { id }, data });
  },

  deleteOption(id: string, db: DbClient = prisma) {
    return db.modifierOption.delete({ where: { id } });
  },
};
