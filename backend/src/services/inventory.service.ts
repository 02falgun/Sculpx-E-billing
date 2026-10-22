import {
  Prisma,
  InventoryUnit,
  InventoryTransactionType,
  type InventoryItem,
  type InventoryTransaction,
} from "@prisma/client";
import { withTransaction } from "../database/prisma.js";
import { outboxService } from "./outbox.service.js";
import { BadRequestError, ConflictError, NotFoundError } from "../lib/errors.js";
import { ErrorCode } from "../constants/error-codes.js";
import {
  inventoryItemModel,
  inventoryTransactionModel,
  recipeModel,
} from "../models/inventory.model.js";
import { menuItemModel } from "../models/menu.model.js";
import type {
  CreateInventoryItemBody,
  UpdateInventoryItemBody,
  StockAdjustmentBody,
  UpsertRecipeBody,
  QueryInventoryItemsParams,
  QueryTransactionsParams,
} from "../validations/inventory.validation.js";
import type {
  InventoryTransactionWithItem,
  PaginationMeta,
  RecipeWithDetails,
} from "../types/inventory.types.js";

/**
 * Decimal-safe unit conversion between compatible units
 * (KG <-> GRAM, LITRE <-> ML; any unit to itself).
 */
export function convertQuantity(
  qty: Prisma.Decimal | number,
  fromUnit: InventoryUnit,
  toUnit: InventoryUnit
): Prisma.Decimal {
  const decimalQty = new Prisma.Decimal(qty);

  if (fromUnit === toUnit) {
    return decimalQty;
  }

  // Mass conversions: KG <-> GRAM
  if (fromUnit === InventoryUnit.KG && toUnit === InventoryUnit.GRAM) {
    return decimalQty.mul(1000);
  }
  if (fromUnit === InventoryUnit.GRAM && toUnit === InventoryUnit.KG) {
    return decimalQty.div(1000);
  }

  // Volume conversions: LITRE <-> ML
  if (fromUnit === InventoryUnit.LITRE && toUnit === InventoryUnit.ML) {
    return decimalQty.mul(1000);
  }
  if (fromUnit === InventoryUnit.ML && toUnit === InventoryUnit.LITRE) {
    return decimalQty.div(1000);
  }

  throw new BadRequestError(`Cannot convert between incompatible units: ${fromUnit} and ${toUnit}`, ErrorCode.INCOMPATIBLE_UNIT_CONVERSION, { fromUnit, toUnit });
}

async function getOwnedItem(tenantId: string, id: string) {
  const item = await inventoryItemModel.findByIdInTenant(id, tenantId);
  if (!item) {
    throw new NotFoundError("Inventory item not found", ErrorCode.ITEM_NOT_FOUND, { id });
  }
  return item;
}

export class InventoryService {
  formatItem(item: InventoryItem) {
    const currentStock = Number(item.currentStock.toFixed(3));
    const minimumThreshold = Number(item.minimumThreshold.toFixed(3));
    const idealStock = item.idealStock ? Number(item.idealStock.toFixed(3)) : 0;
    const unitCost = Number(item.unitCost.toFixed(2));
    const isLowStock = currentStock <= minimumThreshold;

    return {
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit: item.unit,
      currentStock,
      minimumThreshold,
      idealStock,
      unitCost,
      isLowStock,
      supplierName: item.supplierName || undefined,
      lastRestockedAt: item.lastRestockedAt
        ? item.lastRestockedAt.toISOString()
        : undefined,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    };
  }

  formatTransaction(tx: InventoryTransactionWithItem) {
    return {
      id: tx.id,
      inventoryItemId: tx.inventoryItemId,
      inventoryItemName: tx.inventoryItem.name || "Unknown Item",
      type: tx.type,
      quantityChange: Number(tx.quantityChange.toFixed(3)),
      remainingStockAfter: Number(tx.remainingStockAfter.toFixed(3)),
      reason: tx.reason || undefined,
      performedBy: tx.performedByName || "System",
      referenceOrderId: tx.referenceOrderId || undefined,
      referenceKotId: tx.referenceKotId || undefined,
      createdAt: tx.createdAt.toISOString(),
    };
  }

  formatRecipe(recipe: RecipeWithDetails) {
    return {
      id: recipe.id,
      menuItemId: recipe.menuItemId,
      menuItemName: recipe.menuItem.name || recipe.name,
      isActive: recipe.isActive,
      ingredients: recipe.ingredients.map((ing) => ({
        id: ing.id,
        inventoryItemId: ing.inventoryItemId,
        inventoryItemName: ing.inventoryItem.name || "Unknown Ingredient",
        quantityRequired: Number(ing.quantityRequired.toFixed(3)),
        unit: ing.unit,
      })),
      createdAt: recipe.createdAt.toISOString(),
      updatedAt: recipe.updatedAt.toISOString(),
    };
  }

  /**
   * List inventory items with optional filters and pagination.
   */
  async getItems(
    tenantId: string,
    params: QueryInventoryItemsParams
  ): Promise<{ items: ReturnType<InventoryService["formatItem"]>[]; pagination: PaginationMeta }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const filters = { category: params.category, search: params.search };
    const items = await inventoryItemModel.findActiveForTenant(tenantId, filters);
    const total = await inventoryItemModel.countActiveForTenant(tenantId, filters);

    // isLowStock is derived, so it is filtered (and paginated) in memory
    let filtered = items.map((it) => this.formatItem(it));
    if (params.isLowStock !== undefined) {
      filtered = filtered.filter((it) => it.isLowStock === params.isLowStock);
    }

    const totalItems = params.isLowStock !== undefined ? filtered.length : total;
    const paginated = filtered.slice(skip, skip + limit);
    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
      items: paginated,
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

  async getItemById(tenantId: string, id: string) {
    const item = await getOwnedItem(tenantId, id);
    return this.formatItem(item);
  }

  async createItem(
    tenantId: string,
    data: CreateInventoryItemBody,
    userId?: string
  ) {
    const existing = await inventoryItemModel.findBySku(tenantId, data.sku);
    if (existing) {
      throw new ConflictError(`An inventory item with SKU '${data.sku}' already exists`, ErrorCode.SKU_COLLISION, { sku: data.sku });
    }

    const currentStock = new Prisma.Decimal(data.currentStock || 0);

    const item = await inventoryItemModel.create({
      tenantId,
      name: data.name,
      sku: data.sku,
      category: data.category,
      unit: data.unit,
      currentStock,
      minimumThreshold: new Prisma.Decimal(data.minimumThreshold || 0),
      idealStock: data.idealStock ? new Prisma.Decimal(data.idealStock) : null,
      unitCost: new Prisma.Decimal(data.unitCost || 0),
      supplierName: data.supplierName || null,
      lastRestockedAt: currentStock.gt(0) ? new Date() : null,
    });

    // Record any opening stock as a RESTOCK transaction
    if (currentStock.gt(0)) {
      await inventoryTransactionModel.create({
        tenantId,
        inventoryItemId: item.id,
        type: InventoryTransactionType.RESTOCK,
        quantityChange: currentStock,
        remainingStockAfter: currentStock,
        reason: "Initial stock intake on creation",
        performedByUserId: userId || null,
        performedByName: "Admin",
      });
    }

    return this.formatItem(item);
  }

  async updateItem(
    tenantId: string,
    id: string,
    data: UpdateInventoryItemBody
  ) {
    const existing = await getOwnedItem(tenantId, id);

    if (
      data.sku &&
      data.sku !== existing.sku &&
      (await inventoryItemModel.findSkuCollision(tenantId, data.sku, id))
    ) {
      throw new ConflictError(`An inventory item with SKU '${data.sku}' already exists`, ErrorCode.SKU_COLLISION, { sku: data.sku });
    }

    const updated = await inventoryItemModel.update(id, {
      ...(data.name ? { name: data.name } : {}),
      ...(data.sku ? { sku: data.sku } : {}),
      ...(data.category ? { category: data.category } : {}),
      ...(data.unit ? { unit: data.unit } : {}),
      ...(data.minimumThreshold !== undefined
        ? { minimumThreshold: new Prisma.Decimal(data.minimumThreshold) }
        : {}),
      ...(data.idealStock !== undefined
        ? { idealStock: new Prisma.Decimal(data.idealStock) }
        : {}),
      ...(data.unitCost !== undefined
        ? { unitCost: new Prisma.Decimal(data.unitCost) }
        : {}),
      ...(data.supplierName !== undefined ? { supplierName: data.supplierName } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    });

    return this.formatItem(updated);
  }

  /**
   * Record a stock adjustment (Restock, Usage, Wastage, Adjustment, Return).
   * Atomically executes in a PostgreSQL transaction with row locks.
   */
  async recordStockAdjustment(
    tenantId: string,
    data: StockAdjustmentBody,
    userId?: string,
    userName = "Staff"
  ) {
    return await withTransaction(async (tx) => {
      await inventoryItemModel.lockForAdjustment(data.itemId, tenantId, tx);

      const item = await inventoryItemModel.findById(data.itemId, tx);

      if (!item || item.tenantId !== tenantId) {
        throw new NotFoundError("Inventory item not found", ErrorCode.ITEM_NOT_FOUND, {
          itemId: data.itemId,
        });
      }

      const currentStock = item.currentStock;
      const changeDecimal = new Prisma.Decimal(data.quantityChange);

      // The type decides the sign: USAGE/WASTAGE always deduct, RESTOCK/RETURN always add
      let normalizedDelta = changeDecimal;
      if (
        (data.type === InventoryTransactionType.USAGE ||
          data.type === InventoryTransactionType.WASTAGE) &&
        changeDecimal.gt(0)
      ) {
        normalizedDelta = changeDecimal.neg();
      } else if (
        (data.type === InventoryTransactionType.RESTOCK ||
          data.type === InventoryTransactionType.RETURN) &&
        changeDecimal.lt(0)
      ) {
        normalizedDelta = changeDecimal.abs();
      }

      const newStock = currentStock.add(normalizedDelta);

      // Stock may never go negative through a manual adjustment
      if (newStock.lt(0)) {
        throw new BadRequestError(`Insufficient stock: Item '${item.name}' current stock is ${currentStock} ${item.unit}. Requested deduction: ${normalizedDelta.abs()} ${item.unit}.`, ErrorCode.INSUFFICIENT_STOCK, {
            currentStock: Number(currentStock),
            requestedChange: Number(normalizedDelta),
            unit: item.unit,
          });
      }

      await inventoryItemModel.update(
        item.id,
        {
          currentStock: newStock,
          ...(normalizedDelta.gt(0) ? { lastRestockedAt: new Date() } : {}),
        },
        tx
      );

      const transaction = await inventoryTransactionModel.createWithItem(
        {
          tenantId,
          inventoryItemId: item.id,
          type: data.type,
          quantityChange: normalizedDelta,
          remainingStockAfter: newStock,
          reason: data.reason,
          referenceOrderId: data.referenceOrderId || null,
          performedByUserId: userId || null,
          performedByName: userName,
        },
        tx
      );

      if (newStock.lte(item.minimumThreshold)) {
        await outboxService.createEvent(tx, {
          tenantId,
          eventType: "inventory.low_stock",
          topic: "inventory:alerts",
          payload: {
            itemId: item.id,
            name: item.name,
            sku: item.sku,
            currentStock: Number(newStock),
            minimumThreshold: Number(item.minimumThreshold),
            unit: item.unit,
          },
        });
      }

      return this.formatTransaction(transaction);
    });
  }

  async getTransactions(
    tenantId: string,
    params: QueryTransactionsParams
  ): Promise<{
    transactions: ReturnType<InventoryService["formatTransaction"]>[];
    pagination: PaginationMeta;
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const filters = { itemId: params.itemId, type: params.type };
    const txs = await inventoryTransactionModel.findPageForTenant(tenantId, filters, {
      skip,
      take: limit,
    });
    const total = await inventoryTransactionModel.countForTenant(tenantId, filters);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      transactions: txs.map((t) => this.formatTransaction(t)),
      pagination: {
        page,
        limit,
        totalItems: total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async getRecipes(tenantId: string) {
    const recipes = await recipeModel.findActiveForTenant(tenantId);
    return recipes.map((r) => this.formatRecipe(r));
  }

  async getRecipeByMenuItemId(tenantId: string, menuItemId: string) {
    const recipe = await recipeModel.findActiveByMenuItemInTenant(tenantId, menuItemId);

    if (!recipe) {
      throw new NotFoundError("Recipe not found for this menu item", ErrorCode.RECIPE_NOT_FOUND, {
        menuItemId,
      });
    }

    return this.formatRecipe(recipe);
  }

  /** Create or replace the recipe (BOM) of a menu item. */
  async upsertRecipe(tenantId: string, payload: UpsertRecipeBody) {
    const menuItem = await menuItemModel.findByIdInTenant(payload.menuItemId, tenantId);

    if (!menuItem) {
      throw new NotFoundError("Menu item not found", ErrorCode.MENU_ITEM_NOT_FOUND, {
        menuItemId: payload.menuItemId,
      });
    }

    // Every ingredient must be an active item of this tenant
    const ingredientItemIds = payload.ingredients.map((i) => i.inventoryItemId);
    const inventoryItems = await inventoryItemModel.findActiveByIdsInTenant(
      ingredientItemIds,
      tenantId
    );

    if (inventoryItems.length !== ingredientItemIds.length) {
      const foundIds = new Set(inventoryItems.map((i) => i.id));
      const missingIds = ingredientItemIds.filter((id) => !foundIds.has(id));
      throw new BadRequestError("One or more ingredients do not exist or belong to another tenant", ErrorCode.INVALID_INGREDIENTS, { missingIds });
    }

    return await withTransaction(async (tx) => {
      const existing = await recipeModel.findByMenuItemId(payload.menuItemId, tx);

      let recipeId: string;
      if (existing) {
        // Replace the old ingredient list
        await recipeModel.deleteIngredients(existing.id, tx);
        await recipeModel.update(existing.id, { name: payload.name, isActive: true }, tx);
        recipeId = existing.id;
      } else {
        const created = await recipeModel.create(
          {
            tenantId,
            menuItemId: payload.menuItemId,
            name: payload.name,
          },
          tx
        );
        recipeId = created.id;
      }

      for (const ing of payload.ingredients) {
        await recipeModel.createIngredient(
          {
            recipeId,
            inventoryItemId: ing.inventoryItemId,
            quantityRequired: new Prisma.Decimal(ing.quantityRequired),
            unit: ing.unit,
          },
          tx
        );
      }

      // Written above in this same transaction, so it exists
      const fullRecipe = (await recipeModel.findByIdWithDetails(recipeId, tx))!;

      return this.formatRecipe(fullRecipe);
    });
  }

  /**
   * Authoritative, concurrency-safe inventory deduction for an order.
   * Can be invoked directly within an existing transaction or standalone.
   * Idempotent: checks whether orderId or kotId has already deducted stock.
   */
  async deductStockForOrder(
    tx: Prisma.TransactionClient,
    tenantId: string,
    orderId: string,
    kotId?: string
  ): Promise<{ deductedCount: number; transactions: InventoryTransaction[] }> {
    // Idempotency: skip if this order/KOT has already deducted stock
    const existingDeductions = await inventoryTransactionModel.countUsageForReference(
      tenantId,
      { orderId, kotId },
      tx
    );

    if (existingDeductions > 0) {
      return { deductedCount: 0, transactions: [] };
    }

    const orderItems = await recipeModel.findOrderItemsWithRecipes(orderId, tx);
    const recordedTransactions: InventoryTransaction[] = [];

    for (const orderItem of orderItems) {
      const recipe = orderItem.menuItem?.recipe;
      if (!recipe || !recipe.isActive || recipe.ingredients.length === 0) continue;

      for (const ingredient of recipe.ingredients) {
        const item = ingredient.inventoryItem;
        if (!item || !item.isActive) continue;

        await inventoryItemModel.lockForDeduction(item.id, tenantId, tx);

        const freshItem = await inventoryItemModel.findById(item.id, tx);
        if (!freshItem) continue;

        // Recipe quantity is in the recipe's unit; convert to the stock item's unit
        const totalRecipeQuantity = new Prisma.Decimal(ingredient.quantityRequired).mul(
          orderItem.quantity
        );
        const deductionInBaseUnit = convertQuantity(
          totalRecipeQuantity,
          ingredient.unit,
          freshItem.unit
        );

        const newStock = freshItem.currentStock.sub(deductionInBaseUnit);

        await inventoryItemModel.update(freshItem.id, { currentStock: newStock }, tx);

        const invTx = await inventoryTransactionModel.create(
          {
            tenantId,
            inventoryItemId: freshItem.id,
            type: InventoryTransactionType.USAGE,
            quantityChange: deductionInBaseUnit.neg(),
            remainingStockAfter: newStock,
            reason: `Order consumption: ${orderItem.quantity}x ${orderItem.itemName}`,
            referenceOrderId: orderId,
            referenceKotId: kotId || null,
            performedByName: "Kitchen KDS Dispatcher",
          },
          tx
        );

        recordedTransactions.push(invTx);

        if (newStock.lte(freshItem.minimumThreshold)) {
          await outboxService.createEvent(tx, {
            tenantId,
            eventType: "inventory.low_stock",
            topic: "inventory:alerts",
            payload: {
              itemId: freshItem.id,
              name: freshItem.name,
              sku: freshItem.sku,
              currentStock: Number(newStock),
              minimumThreshold: Number(freshItem.minimumThreshold),
              unit: freshItem.unit,
            },
          });
        }

        // Auto-86: an ingredient at or below zero makes the menu item unavailable
        if (newStock.lte(0) && orderItem.menuItemId) {
          await menuItemModel.update(orderItem.menuItemId, { isAvailable: false }, tx);

          await outboxService.createEvent(tx, {
            tenantId,
            eventType: "menu.item_unavailable",
            topic: "menu:updates",
            payload: {
              menuItemId: orderItem.menuItemId,
              reason: `Ingredient out of stock: ${freshItem.name}`,
            },
          });
        }
      }
    }

    return { deductedCount: recordedTransactions.length, transactions: recordedTransactions };
  }
}

export const inventoryService = new InventoryService();
