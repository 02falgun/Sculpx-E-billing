import type { FastifyPluginAsync } from "fastify";
import { inventoryService } from "../services/inventory.service.js";
import { requireRoles } from "../middleware/auth.js";
import {
  CreateInventoryItemSchema,
  UpdateInventoryItemSchema,
  StockAdjustmentSchema,
  UpsertRecipeSchema,
  QueryInventoryItemsSchema,
  QueryTransactionsSchema,
} from "../schemas/inventory.schema.js";
import { z } from "zod";

const IdParamSchema = z.object({
  id: z.string().uuid("Invalid item UUID"),
});

const MenuItemIdParamSchema = z.object({
  menuItemId: z.string().uuid("Invalid menu item UUID"),
});

export const inventoryRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /inventory/items
   * List inventory items with optional isLowStock, category, search, and pagination.
   * Access: ADMIN, MANAGER, SUPER_ADMIN, KITCHEN_STAFF, CASHIER.
   */
  fastify.get(
    "/items",
    {
      preHandler: [
        requireRoles(
          "ADMIN",
          "MANAGER",
          "SUPER_ADMIN",
          "KITCHEN_STAFF",
          "CASHIER"
        ),
      ],
    },
    async (request, reply) => {
      const query = QueryInventoryItemsSchema.parse(request.query);
      const user = request.authenticatedUser!;

      const result = await inventoryService.getItems(user.tenantId, query);

      return reply.code(200).send({
        success: true,
        data: result,
      });
    }
  );

  /**
   * GET /inventory/items/:id
   * Retrieve single inventory item by ID.
   * Access: ADMIN, MANAGER, SUPER_ADMIN, KITCHEN_STAFF.
   */
  fastify.get(
    "/items/:id",
    {
      preHandler: [
        requireRoles("ADMIN", "MANAGER", "SUPER_ADMIN", "KITCHEN_STAFF"),
      ],
    },
    async (request, reply) => {
      const { id } = IdParamSchema.parse(request.params);
      const user = request.authenticatedUser!;

      const item = await inventoryService.getItemById(user.tenantId, id);

      return reply.code(200).send({
        success: true,
        data: item,
      });
    }
  );

  /**
   * POST /inventory/items
   * Create new inventory item.
   * Access: ADMIN, MANAGER, SUPER_ADMIN.
   */
  fastify.post(
    "/items",
    {
      preHandler: [requireRoles("ADMIN", "MANAGER", "SUPER_ADMIN")],
    },
    async (request, reply) => {
      const body = CreateInventoryItemSchema.parse(request.body);
      const user = request.authenticatedUser!;

      const item = await inventoryService.createItem(
        user.tenantId,
        body,
        user.id
      );

      return reply.code(201).send({
        success: true,
        data: item,
        message: "Inventory item created successfully",
      });
    }
  );

  /**
   * PATCH /inventory/items/:id
   * Update existing inventory item.
   * Access: ADMIN, MANAGER, SUPER_ADMIN.
   */
  fastify.patch(
    "/items/:id",
    {
      preHandler: [requireRoles("ADMIN", "MANAGER", "SUPER_ADMIN")],
    },
    async (request, reply) => {
      const { id } = IdParamSchema.parse(request.params);
      const body = UpdateInventoryItemSchema.parse(request.body);
      const user = request.authenticatedUser!;

      const item = await inventoryService.updateItem(
        user.tenantId,
        id,
        body
      );

      return reply.code(200).send({
        success: true,
        data: item,
        message: "Inventory item updated successfully",
      });
    }
  );

  /**
   * POST /inventory/adjustments
   * Record stock movement (restock, usage, wastage, adjustment, return).
   * Access: ADMIN, MANAGER, SUPER_ADMIN.
   */
  fastify.post(
    "/adjustments",
    {
      preHandler: [requireRoles("ADMIN", "MANAGER", "SUPER_ADMIN")],
    },
    async (request, reply) => {
      const body = StockAdjustmentSchema.parse(request.body);
      const user = request.authenticatedUser!;

      const transaction = await inventoryService.recordStockAdjustment(
        user.tenantId,
        body,
        user.id,
        user.name || "Manager"
      );

      return reply.code(201).send({
        success: true,
        data: transaction,
        message: "Stock adjustment recorded successfully",
      });
    }
  );

  /**
   * GET /inventory/transactions
   * Query inventory transaction history.
   * Access: ADMIN, MANAGER, SUPER_ADMIN.
   */
  fastify.get(
    "/transactions",
    {
      preHandler: [requireRoles("ADMIN", "MANAGER", "SUPER_ADMIN")],
    },
    async (request, reply) => {
      const query = QueryTransactionsSchema.parse(request.query);
      const user = request.authenticatedUser!;

      const result = await inventoryService.getTransactions(
        user.tenantId,
        query
      );

      return reply.code(200).send({
        success: true,
        data: result,
      });
    }
  );

  /**
   * GET /inventory/recipes
   * Get all active recipes.
   * Access: ADMIN, MANAGER, SUPER_ADMIN, KITCHEN_STAFF.
   */
  fastify.get(
    "/recipes",
    {
      preHandler: [
        requireRoles("ADMIN", "MANAGER", "SUPER_ADMIN", "KITCHEN_STAFF"),
      ],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;
      const recipes = await inventoryService.getRecipes(user.tenantId);

      return reply.code(200).send({
        success: true,
        data: recipes,
      });
    }
  );

  /**
   * GET /inventory/recipes/:menuItemId
   * Get recipe for a specific menu item.
   * Access: ADMIN, MANAGER, SUPER_ADMIN, KITCHEN_STAFF.
   */
  fastify.get(
    "/recipes/:menuItemId",
    {
      preHandler: [
        requireRoles("ADMIN", "MANAGER", "SUPER_ADMIN", "KITCHEN_STAFF"),
      ],
    },
    async (request, reply) => {
      const { menuItemId } = MenuItemIdParamSchema.parse(request.params);
      const user = request.authenticatedUser!;

      const recipe = await inventoryService.getRecipeByMenuItemId(
        user.tenantId,
        menuItemId
      );

      return reply.code(200).send({
        success: true,
        data: recipe,
      });
    }
  );

  /**
   * POST /inventory/recipes
   * Upsert a recipe (BOM) for a menu item.
   * Access: ADMIN, MANAGER, SUPER_ADMIN.
   */
  fastify.post(
    "/recipes",
    {
      preHandler: [requireRoles("ADMIN", "MANAGER", "SUPER_ADMIN")],
    },
    async (request, reply) => {
      const body = UpsertRecipeSchema.parse(request.body);
      const user = request.authenticatedUser!;

      const recipe = await inventoryService.upsertRecipe(
        user.tenantId,
        body
      );

      return reply.code(200).send({
        success: true,
        data: recipe,
        message: "Recipe saved successfully",
      });
    }
  );
};
