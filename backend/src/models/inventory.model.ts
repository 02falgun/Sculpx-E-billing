import { InventoryTransactionType, type Prisma } from "@prisma/client";
import { prisma, type DbClient } from "../database/prisma.js";
import type { InventoryItemFilters, InventoryTransactionFilters } from "../types/inventory.types.js";

const recipeDetails = {
  menuItem: true,
  ingredients: {
    include: {
      inventoryItem: true,
    },
  },
} satisfies Prisma.RecipeInclude;

function activeItemWhere(
  tenantId: string,
  filters: InventoryItemFilters
): Prisma.InventoryItemWhereInput {
  return {
    tenantId,
    isActive: true,
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search, mode: "insensitive" } },
            { sku: { contains: filters.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function transactionWhere(
  tenantId: string,
  filters: InventoryTransactionFilters
): Prisma.InventoryTransactionWhereInput {
  return {
    tenantId,
    ...(filters.itemId ? { inventoryItemId: filters.itemId } : {}),
    ...(filters.type ? { type: filters.type as InventoryTransactionType } : {}),
  };
}

export const inventoryItemModel = {
  findActiveForTenant(tenantId: string, filters: InventoryItemFilters, db: DbClient = prisma) {
    return db.inventoryItem.findMany({
      where: activeItemWhere(tenantId, filters),
      orderBy: { name: "asc" },
    });
  },

  countActiveForTenant(tenantId: string, filters: InventoryItemFilters, db: DbClient = prisma) {
    return db.inventoryItem.count({ where: activeItemWhere(tenantId, filters) });
  },

  findActiveByIdsInTenant(ids: string[], tenantId: string, db: DbClient = prisma) {
    return db.inventoryItem.findMany({
      where: {
        id: { in: ids },
        tenantId,
        isActive: true,
      },
    });
  },

  findById(id: string, db: DbClient = prisma) {
    return db.inventoryItem.findUnique({ where: { id } });
  },

  findByIdInTenant(id: string, tenantId: string, db: DbClient = prisma) {
    return db.inventoryItem.findFirst({ where: { id, tenantId } });
  },

  findBySku(tenantId: string, sku: string, db: DbClient = prisma) {
    return db.inventoryItem.findFirst({ where: { tenantId, sku } });
  },

  /** Another item in the tenant already using `sku`. */
  findSkuCollision(tenantId: string, sku: string, excludeId: string, db: DbClient = prisma) {
    return db.inventoryItem.findFirst({ where: { tenantId, sku, id: { not: excludeId } } });
  },

  /** Row-lock the item for a manual stock adjustment (SELECT ... FOR UPDATE). */
  lockForAdjustment(id: string, tenantId: string, db: DbClient = prisma) {
    return db.$queryRaw`
      SELECT id, current_stock, minimum_threshold, tenant_id FROM inventory_items
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      FOR UPDATE
    `;
  },

  /** Row-lock the item for order stock deduction (SELECT ... FOR UPDATE). */
  lockForDeduction(id: string, tenantId: string, db: DbClient = prisma) {
    return db.$queryRaw`
      SELECT id, current_stock, minimum_threshold FROM inventory_items
      WHERE id = ${id}::uuid AND tenant_id = ${tenantId}::uuid
      FOR UPDATE
    `;
  },

  create(data: Prisma.InventoryItemUncheckedCreateInput, db: DbClient = prisma) {
    return db.inventoryItem.create({ data });
  },

  update(id: string, data: Prisma.InventoryItemUncheckedUpdateInput, db: DbClient = prisma) {
    return db.inventoryItem.update({ where: { id }, data });
  },
};

export const inventoryTransactionModel = {
  findPageForTenant(
    tenantId: string,
    filters: InventoryTransactionFilters,
    page: { skip: number; take: number },
    db: DbClient = prisma
  ) {
    return db.inventoryTransaction.findMany({
      where: transactionWhere(tenantId, filters),
      orderBy: { createdAt: "desc" },
      skip: page.skip,
      take: page.take,
      include: {
        inventoryItem: true,
      },
    });
  },

  countForTenant(tenantId: string, filters: InventoryTransactionFilters, db: DbClient = prisma) {
    return db.inventoryTransaction.count({ where: transactionWhere(tenantId, filters) });
  },

  /** USAGE transactions already recorded for a KOT (when given) or else an order. */
  countUsageForReference(
    tenantId: string,
    ref: { orderId: string; kotId?: string },
    db: DbClient = prisma
  ) {
    return db.inventoryTransaction.count({
      where: {
        tenantId,
        type: InventoryTransactionType.USAGE,
        ...(ref.kotId ? { referenceKotId: ref.kotId } : { referenceOrderId: ref.orderId }),
      },
    });
  },

  /** Transactions performed by the user (historical references that block hard deletion). */
  countPerformedBy(userId: string, db: DbClient = prisma) {
    return db.inventoryTransaction.count({ where: { performedByUserId: userId } });
  },

  create(data: Prisma.InventoryTransactionUncheckedCreateInput, db: DbClient = prisma) {
    return db.inventoryTransaction.create({ data });
  },

  createWithItem(data: Prisma.InventoryTransactionUncheckedCreateInput, db: DbClient = prisma) {
    return db.inventoryTransaction.create({
      data,
      include: {
        inventoryItem: true,
      },
    });
  },
};

export const recipeModel = {
  findActiveForTenant(tenantId: string, db: DbClient = prisma) {
    return db.recipe.findMany({
      where: { tenantId, isActive: true },
      include: recipeDetails,
      orderBy: { name: "asc" },
    });
  },

  findActiveByMenuItemInTenant(tenantId: string, menuItemId: string, db: DbClient = prisma) {
    return db.recipe.findFirst({
      where: { tenantId, menuItemId, isActive: true },
      include: recipeDetails,
    });
  },

  findByMenuItemId(menuItemId: string, db: DbClient = prisma) {
    return db.recipe.findUnique({ where: { menuItemId } });
  },

  findByIdWithDetails(id: string, db: DbClient = prisma) {
    return db.recipe.findUnique({ where: { id }, include: recipeDetails });
  },

  create(data: Prisma.RecipeUncheckedCreateInput, db: DbClient = prisma) {
    return db.recipe.create({ data });
  },

  update(id: string, data: Prisma.RecipeUncheckedUpdateInput, db: DbClient = prisma) {
    return db.recipe.update({ where: { id }, data });
  },

  deleteIngredients(recipeId: string, db: DbClient = prisma) {
    return db.recipeIngredient.deleteMany({ where: { recipeId } });
  },

  createIngredient(data: Prisma.RecipeIngredientUncheckedCreateInput, db: DbClient = prisma) {
    return db.recipeIngredient.create({ data });
  },

  /** Order items of `orderId` with each menu item's recipe and ingredient stock rows. */
  findOrderItemsWithRecipes(orderId: string, db: DbClient = prisma) {
    return db.orderItem.findMany({
      where: { orderId },
      include: {
        menuItem: {
          include: {
            recipe: {
              include: {
                ingredients: {
                  include: {
                    inventoryItem: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  },
};
