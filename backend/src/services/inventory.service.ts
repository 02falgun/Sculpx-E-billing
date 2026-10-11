import {
  Prisma,
  type PrismaClient,
  InventoryUnit,
  InventoryTransactionType,
} from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { outboxService } from "./outbox.service.js";
import { AppError } from "../lib/errors.js";
import type {
  CreateInventoryItemBody,
  UpdateInventoryItemBody,
  StockAdjustmentBody,
  UpsertRecipeBody,
  QueryInventoryItemsParams,
  QueryTransactionsParams,
} from "../schemas/inventory.schema.js";

// =============================================================================
// UNIT CONVERSION UTILITIES
// =============================================================================

/**
 * Decimal-safe unit conversion factor to base units.
 * Mass base: GRAM
 * Volume base: ML
 * Discrete units: Self (1)
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

  // Incompatible unit dimensions
  throw new AppError(
    `Cannot convert between incompatible units: ${fromUnit} and ${toUnit}`,
    400,
    "INCOMPATIBLE_UNIT_CONVERSION",
    { fromUnit, toUnit }
  );
}

// =============================================================================
// INVENTORY SERVICE
// =============================================================================

export class InventoryService {
  /**
   * Format an inventory item into consistent client response.
   */
  formatItem(item: any) {
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

  /**
   * Format an inventory transaction into consistent client response.
   */
  formatTransaction(tx: any) {
    return {
      id: tx.id,
      inventoryItemId: tx.inventoryItemId,
      inventoryItemName: tx.inventoryItem?.name || "Unknown Item",
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

  /**
   * Format a recipe with ingredient details.
   */
  formatRecipe(recipe: any) {
    return {
      id: recipe.id,
      menuItemId: recipe.menuItemId,
      menuItemName: recipe.menuItem?.name || recipe.name,
      isActive: recipe.isActive,
      ingredients: (recipe.ingredients || []).map((ing: any) => ({
        id: ing.id,
        inventoryItemId: ing.inventoryItemId,
        inventoryItemName: ing.inventoryItem?.name || "Unknown Ingredient",
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
  ): Promise<{
    items: ReturnType<InventoryService["formatItem"]>[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryItemWhereInput = {
      tenantId,
      isActive: true,
      ...(params.category ? { category: params.category } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: "insensitive" } },
              { sku: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: { name: "asc" },
    });
    const total = await prisma.inventoryItem.count({ where });

    // Apply isLowStock filter if specified
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

  /**
   * Get single inventory item by ID.
   */
  async getItemById(tenantId: string, id: string) {
    const item = await prisma.inventoryItem.findFirst({
      where: { id, tenantId },
    });

    if (!item) {
      throw new AppError("Inventory item not found", 404, "ITEM_NOT_FOUND", { id });
    }

    return this.formatItem(item);
  }

  /**
   * Create a new inventory item.
   */
  async createItem(
    tenantId: string,
    data: CreateInventoryItemBody,
    userId?: string
  ) {
    // Check SKU collision within tenant
    const existing = await prisma.inventoryItem.findFirst({
      where: { tenantId, sku: data.sku },
    });

    if (existing) {
      throw new AppError(
        `An inventory item with SKU '${data.sku}' already exists`,
        409,
        "SKU_COLLISION",
        { sku: data.sku }
      );
    }

    const currentStock = new Prisma.Decimal(data.currentStock || 0);

    const item = await prisma.inventoryItem.create({
      data: {
        tenantId,
        name: data.name,
        sku: data.sku,
        category: data.category,
        unit: data.unit as InventoryUnit,
        currentStock,
        minimumThreshold: new Prisma.Decimal(data.minimumThreshold || 0),
        idealStock: data.idealStock ? new Prisma.Decimal(data.idealStock) : null,
        unitCost: new Prisma.Decimal(data.unitCost || 0),
        supplierName: data.supplierName || null,
        lastRestockedAt: currentStock.gt(0) ? new Date() : null,
      },
    });

    // If initial stock was provided, record opening stock transaction
    if (currentStock.gt(0)) {
      await prisma.inventoryTransaction.create({
        data: {
          tenantId,
          inventoryItemId: item.id,
          type: InventoryTransactionType.RESTOCK,
          quantityChange: currentStock,
          remainingStockAfter: currentStock,
          reason: "Initial stock intake on creation",
          performedByUserId: userId || null,
          performedByName: "Admin",
        },
      });
    }

    return this.formatItem(item);
  }

  /**
   * Update an existing inventory item.
   */
  async updateItem(
    tenantId: string,
    id: string,
    data: UpdateInventoryItemBody
  ) {
    const existing = await prisma.inventoryItem.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      throw new AppError("Inventory item not found", 404, "ITEM_NOT_FOUND", { id });
    }

    if (data.sku && data.sku !== existing.sku) {
      const collision = await prisma.inventoryItem.findFirst({
        where: { tenantId, sku: data.sku, id: { not: id } },
      });
      if (collision) {
        throw new AppError(
          `An inventory item with SKU '${data.sku}' already exists`,
          409,
          "SKU_COLLISION",
          { sku: data.sku }
        );
      }
    }

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.sku ? { sku: data.sku } : {}),
        ...(data.category ? { category: data.category } : {}),
        ...(data.unit ? { unit: data.unit as InventoryUnit } : {}),
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
      },
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
    return await prisma.$transaction(async (tx) => {
      // 1. Lock inventory item row
      await tx.$queryRaw`
        SELECT id, current_stock, minimum_threshold, tenant_id FROM inventory_items
        WHERE id = ${data.itemId}::uuid AND tenant_id = ${tenantId}::uuid
        FOR UPDATE
      `;

      const item = await tx.inventoryItem.findUnique({
        where: { id: data.itemId },
      });

      if (!item || item.tenantId !== tenantId) {
        throw new AppError("Inventory item not found", 404, "ITEM_NOT_FOUND", {
          itemId: data.itemId,
        });
      }

      const currentStock = item.currentStock;
      const changeDecimal = new Prisma.Decimal(data.quantityChange);

      // Determine sign based on transaction type if user provided unsigned quantity
      let normalizedDelta = changeDecimal;
      if (
        (data.type === "USAGE" || data.type === "WASTAGE") &&
        changeDecimal.gt(0)
      ) {
        normalizedDelta = changeDecimal.neg();
      } else if (
        (data.type === "RESTOCK" || data.type === "RETURN") &&
        changeDecimal.lt(0)
      ) {
        normalizedDelta = changeDecimal.abs();
      }

      const newStock = currentStock.add(normalizedDelta);

      // Insufficient stock policy: prevent stock from dropping below 0
      if (newStock.lt(0)) {
        throw new AppError(
          `Insufficient stock: Item '${item.name}' current stock is ${currentStock} ${item.unit}. Requested deduction: ${normalizedDelta.abs()} ${item.unit}.`,
          400,
          "INSUFFICIENT_STOCK",
          {
            currentStock: Number(currentStock),
            requestedChange: Number(normalizedDelta),
            unit: item.unit,
          }
        );
      }

      // 2. Update stock balance
      const updatedItem = await tx.inventoryItem.update({
        where: { id: item.id },
        data: {
          currentStock: newStock,
          ...(normalizedDelta.gt(0) ? { lastRestockedAt: new Date() } : {}),
        },
      });

      // 3. Persist transaction record
      const transaction = await tx.inventoryTransaction.create({
        data: {
          tenantId,
          inventoryItemId: item.id,
          type: data.type as InventoryTransactionType,
          quantityChange: normalizedDelta,
          remainingStockAfter: newStock,
          reason: data.reason,
          referenceOrderId: data.referenceOrderId || null,
          performedByUserId: userId || null,
          performedByName: userName,
        },
        include: {
          inventoryItem: true,
        },
      });

      // 4. Trigger Outbox alerts if low stock threshold crossed
      const isLowStock = newStock.lte(item.minimumThreshold);
      if (isLowStock) {
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

  /**
   * List inventory transactions with filtering and pagination.
   */
  async getTransactions(
    tenantId: string,
    params: QueryTransactionsParams
  ): Promise<{
    transactions: ReturnType<InventoryService["formatTransaction"]>[];
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryTransactionWhereInput = {
      tenantId,
      ...(params.itemId ? { inventoryItemId: params.itemId } : {}),
      ...(params.type ? { type: params.type as InventoryTransactionType } : {}),
    };

    const txs = await prisma.inventoryTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        inventoryItem: true,
      },
    });
    const total = await prisma.inventoryTransaction.count({ where });

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

  /**
   * Get all recipes defined for the tenant.
   */
  async getRecipes(tenantId: string) {
    const recipes = await prisma.recipe.findMany({
      where: { tenantId, isActive: true },
      include: {
        menuItem: true,
        ingredients: {
          include: {
            inventoryItem: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return recipes.map((r) => this.formatRecipe(r));
  }

  /**
   * Get recipe for a specific menu item.
   */
  async getRecipeByMenuItemId(tenantId: string, menuItemId: string) {
    const recipe = await prisma.recipe.findFirst({
      where: { tenantId, menuItemId, isActive: true },
      include: {
        menuItem: true,
        ingredients: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });

    if (!recipe) {
      throw new AppError("Recipe not found for this menu item", 404, "RECIPE_NOT_FOUND", {
        menuItemId,
      });
    }

    return this.formatRecipe(recipe);
  }

  /**
   * Create or update a Recipe (BOM) for a menu item.
   */
  async upsertRecipe(tenantId: string, payload: UpsertRecipeBody) {
    // 1. Verify MenuItem exists and belongs to the tenant
    const menuItem = await prisma.menuItem.findFirst({
      where: { id: payload.menuItemId, category: { tenantId } },
    });

    if (!menuItem) {
      throw new AppError("Menu item not found", 404, "MENU_ITEM_NOT_FOUND", {
        menuItemId: payload.menuItemId,
      });
    }

    // 2. Validate all ingredients exist and belong to the tenant
    const ingredientItemIds = payload.ingredients.map((i) => i.inventoryItemId);
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        id: { in: ingredientItemIds },
        tenantId,
        isActive: true,
      },
    });

    if (inventoryItems.length !== ingredientItemIds.length) {
      const foundIds = new Set(inventoryItems.map((i) => i.id));
      const missingIds = ingredientItemIds.filter((id) => !foundIds.has(id));
      throw new AppError(
        "One or more ingredients do not exist or belong to another tenant",
        400,
        "INVALID_INGREDIENTS",
        { missingIds }
      );
    }

    // 3. Upsert recipe within transaction
    return await prisma.$transaction(async (tx) => {
      // Find existing recipe
      const existing = await tx.recipe.findUnique({
        where: { menuItemId: payload.menuItemId },
      });

      let recipeId = existing?.id;

      if (existing) {
        // Delete old ingredients
        await tx.recipeIngredient.deleteMany({
          where: { recipeId: existing.id },
        });

        await tx.recipe.update({
          where: { id: existing.id },
          data: {
            name: payload.name,
            isActive: true,
          },
        });
      } else {
        const created = await tx.recipe.create({
          data: {
            tenantId,
            menuItemId: payload.menuItemId,
            name: payload.name,
          },
        });
        recipeId = created.id;
      }

      // Insert new ingredients
      for (const ing of payload.ingredients) {
        await tx.recipeIngredient.create({
          data: {
            recipeId: recipeId!,
            inventoryItemId: ing.inventoryItemId,
            quantityRequired: new Prisma.Decimal(ing.quantityRequired),
            unit: ing.unit as InventoryUnit,
          },
        });
      }

      const fullRecipe = await tx.recipe.findUnique({
        where: { id: recipeId },
        include: {
          menuItem: true,
          ingredients: {
            include: {
              inventoryItem: true,
            },
          },
        },
      });

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
  ): Promise<{ deductedCount: number; transactions: any[] }> {
    // 1. Idempotency Check: if deductions have already occurred for this order/kot, skip!
    const existingDeductions = await tx.inventoryTransaction.count({
      where: {
        tenantId,
        type: InventoryTransactionType.USAGE,
        ...(kotId ? { referenceKotId: kotId } : { referenceOrderId: orderId }),
      },
    });

    if (existingDeductions > 0) {
      return { deductedCount: 0, transactions: [] };
    }

    // 2. Fetch order items
    const orderItems = await tx.orderItem.findMany({
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

    const recordedTransactions: any[] = [];

    // 3. Process each item's BOM
    for (const orderItem of orderItems) {
      const recipe = orderItem.menuItem?.recipe;
      if (!recipe || !recipe.isActive || recipe.ingredients.length === 0) {
        // No BOM defined for this menu item; skip
        continue;
      }

      for (const ingredient of recipe.ingredients) {
        const item = ingredient.inventoryItem;
        if (!item || !item.isActive) continue;

        // Concurrency lock on inventory item row
        await tx.$queryRaw`
          SELECT id, current_stock, minimum_threshold FROM inventory_items
          WHERE id = ${item.id}::uuid AND tenant_id = ${tenantId}::uuid
          FOR UPDATE
        `;

        const freshItem = await tx.inventoryItem.findUnique({
          where: { id: item.id },
        });
        if (!freshItem) continue;

        // Calculate quantity in recipe unit, then convert to inventory item's base unit
        const totalRecipeQuantity = new Prisma.Decimal(ingredient.quantityRequired).mul(
          orderItem.quantity
        );
        const deductionInBaseUnit = convertQuantity(
          totalRecipeQuantity,
          ingredient.unit,
          freshItem.unit
        );

        const currentStock = freshItem.currentStock;
        const newStock = currentStock.sub(deductionInBaseUnit);

        // Update current stock
        await tx.inventoryItem.update({
          where: { id: freshItem.id },
          data: {
            currentStock: newStock,
          },
        });

        // Record usage transaction
        const invTx = await tx.inventoryTransaction.create({
          data: {
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
        });

        recordedTransactions.push(invTx);

        // Low stock alert
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

        // Auto-86 policy: if ingredient drops to 0 or below, mark linked menu item unavailable
        if (newStock.lte(0) && orderItem.menuItemId) {
          await tx.menuItem.update({
            where: { id: orderItem.menuItemId },
            data: { isAvailable: false },
          });

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
