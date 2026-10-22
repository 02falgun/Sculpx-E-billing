import type { FastifyReply, FastifyRequest } from "fastify";
import { validate } from "../lib/validate.js";
import { sendSuccess } from "../lib/response.js";
import { getActor } from "../lib/context.js";
import { inventoryService } from "../services/inventory.service.js";
import {
  CreateInventoryItemSchema,
  UpdateInventoryItemSchema,
  StockAdjustmentSchema,
  UpsertRecipeSchema,
  QueryInventoryItemsSchema,
  QueryTransactionsSchema,
  IdParamSchema,
  MenuItemIdParamSchema,
} from "../validations/inventory.validation.js";

export const inventoryController = {
  async listItems(request: FastifyRequest, reply: FastifyReply) {
    const query = validate(QueryInventoryItemsSchema, request.query);
    const { user } = getActor(request);
    const result = await inventoryService.getItems(user.tenantId, query);
    return sendSuccess(request, reply, result);
  },

  async getItem(request: FastifyRequest, reply: FastifyReply) {
    const { id } = validate(IdParamSchema, request.params);
    const { user } = getActor(request);
    const item = await inventoryService.getItemById(user.tenantId, id);
    return sendSuccess(request, reply, item);
  },

  async createItem(request: FastifyRequest, reply: FastifyReply) {
    const body = validate(CreateInventoryItemSchema, request.body);
    const { user } = getActor(request);
    const item = await inventoryService.createItem(user.tenantId, body, user.id);
    return sendSuccess(request, reply, item, 201, "Inventory item created successfully");
  },

  async updateItem(request: FastifyRequest, reply: FastifyReply) {
    const { id } = validate(IdParamSchema, request.params);
    const body = validate(UpdateInventoryItemSchema, request.body);
    const { user } = getActor(request);
    const item = await inventoryService.updateItem(user.tenantId, id, body);
    return sendSuccess(request, reply, item, 200, "Inventory item updated successfully");
  },

  async recordAdjustment(request: FastifyRequest, reply: FastifyReply) {
    const body = validate(StockAdjustmentSchema, request.body);
    const { user } = getActor(request);
    const transaction = await inventoryService.recordStockAdjustment(
      user.tenantId,
      body,
      user.id,
      user.name || "Manager"
    );
    return sendSuccess(request, reply, transaction, 201, "Stock adjustment recorded successfully");
  },

  async listTransactions(request: FastifyRequest, reply: FastifyReply) {
    const query = validate(QueryTransactionsSchema, request.query);
    const { user } = getActor(request);
    const result = await inventoryService.getTransactions(user.tenantId, query);
    return sendSuccess(request, reply, result);
  },

  async listRecipes(request: FastifyRequest, reply: FastifyReply) {
    const { user } = getActor(request);
    const recipes = await inventoryService.getRecipes(user.tenantId);
    return sendSuccess(request, reply, recipes);
  },

  async getRecipe(request: FastifyRequest, reply: FastifyReply) {
    const { menuItemId } = validate(MenuItemIdParamSchema, request.params);
    const { user } = getActor(request);
    const recipe = await inventoryService.getRecipeByMenuItemId(user.tenantId, menuItemId);
    return sendSuccess(request, reply, recipe);
  },

  async upsertRecipe(request: FastifyRequest, reply: FastifyReply) {
    const body = validate(UpsertRecipeSchema, request.body);
    const { user } = getActor(request);
    const recipe = await inventoryService.upsertRecipe(user.tenantId, body);
    return sendSuccess(request, reply, recipe, 200, "Recipe saved successfully");
  },
};
