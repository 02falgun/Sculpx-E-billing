import type { FastifyReply, FastifyRequest } from "fastify";
import type { ZodType, ZodTypeDef } from "zod";
import { validate as validateWith } from "../lib/validate.js";
import { sendSuccess } from "../lib/response.js";
import { getActor } from "../lib/context.js";
import { menuService } from "../services/menu.service.js";
import { qrService } from "../services/qr.service.js";
import {
  idParamSchema,
  itemParamSchema,
  groupParamSchema,
  optionParamSchema,
  createCategorySchema,
  updateCategorySchema,
  categoryListQuerySchema,
  createMenuItemSchema,
  updateMenuItemSchema,
  menuItemListQuerySchema,
  createModifierGroupSchema,
  updateModifierGroupSchema,
  createModifierOptionSchema,
  updateModifierOptionSchema,
} from "../validations/menu.validation.js";

const VALIDATION_MESSAGE = "Request validation failed";

function validate<T>(schema: ZodType<T, ZodTypeDef, unknown>, data: unknown): T {
  return validateWith(schema, data, VALIDATION_MESSAGE);
}

function tenantOf(request: FastifyRequest): string {
  return getActor(request).user.tenantId;
}

export const menuController = {
  async getQrContext(request: FastifyRequest, reply: FastifyReply) {
    const { token } = request.params as { token: string };
    const qrContext = await qrService.resolvePublicQrContext(token);
    return sendSuccess(request, reply, qrContext);
  },

  // Categories

  async listCategories(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = tenantOf(request);
    const query = validate(categoryListQuerySchema, request.query);
    const categories = await menuService.listCategories(tenantId, query);
    return sendSuccess(request, reply, categories);
  },

  async getCategory(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = tenantOf(request);
    const { id } = validate(idParamSchema, request.params);
    const category = await menuService.getCategoryById(tenantId, id);
    return sendSuccess(request, reply, category);
  },

  async createCategory(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = tenantOf(request);
    const body = validate(createCategorySchema, request.body);
    const category = await menuService.createCategory(tenantId, body);
    return sendSuccess(request, reply, category, 201, "Category created successfully");
  },

  async updateCategory(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = tenantOf(request);
    const { id } = validate(idParamSchema, request.params);
    const body = validate(updateCategorySchema, request.body);
    const category = await menuService.updateCategory(tenantId, id, body);
    return sendSuccess(request, reply, category, 200, "Category updated successfully");
  },

  async deleteCategory(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = tenantOf(request);
    const { id } = validate(idParamSchema, request.params);
    const result = await menuService.deleteCategory(tenantId, id);
    return sendSuccess(request, reply, null, 200, result.message);
  },

  // Menu items

  async listMenuItems(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = tenantOf(request);
    const query = validate(menuItemListQuerySchema, request.query);
    const result = await menuService.listMenuItems(tenantId, query);
    return reply.status(200).send({
      success: true,
      data: result.items,
      pagination: result.pagination,
      meta: {
        requestId: request.id,
        timestamp: new Date().toISOString(),
        serverVersion: "1.0.0",
      },
    });
  },

  async getMenuItem(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = tenantOf(request);
    const { id } = validate(idParamSchema, request.params);
    const item = await menuService.getMenuItemById(tenantId, id);
    return sendSuccess(request, reply, item);
  },

  async createMenuItem(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = tenantOf(request);
    const body = validate(createMenuItemSchema, request.body);
    const item = await menuService.createMenuItem(tenantId, body);
    return sendSuccess(request, reply, item, 201, "Menu item created successfully");
  },

  async updateMenuItem(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = tenantOf(request);
    const { id } = validate(idParamSchema, request.params);
    const body = validate(updateMenuItemSchema, request.body);
    const item = await menuService.updateMenuItem(tenantId, id, body);
    return sendSuccess(request, reply, item, 200, "Menu item updated successfully");
  },

  async deleteMenuItem(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = tenantOf(request);
    const { id } = validate(idParamSchema, request.params);
    const result = await menuService.deleteMenuItem(tenantId, id);
    return sendSuccess(request, reply, null, 200, result.message);
  },

  // Modifier groups & options

  async listModifierGroups(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = tenantOf(request);
    const { itemId } = validate(itemParamSchema, request.params);
    const groups = await menuService.listModifierGroups(tenantId, itemId);
    return sendSuccess(request, reply, groups);
  },

  async createModifierGroup(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = tenantOf(request);
    const { itemId } = validate(itemParamSchema, request.params);
    const body = validate(createModifierGroupSchema, request.body);
    const group = await menuService.createModifierGroup(tenantId, itemId, body);
    return sendSuccess(request, reply, group, 201, "Modifier group created successfully");
  },

  async updateModifierGroup(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = tenantOf(request);
    const { groupId } = validate(groupParamSchema, request.params);
    const body = validate(updateModifierGroupSchema, request.body);
    const group = await menuService.updateModifierGroup(tenantId, groupId, body);
    return sendSuccess(request, reply, group, 200, "Modifier group updated successfully");
  },

  async deleteModifierGroup(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = tenantOf(request);
    const { groupId } = validate(groupParamSchema, request.params);
    const result = await menuService.deleteModifierGroup(tenantId, groupId);
    return sendSuccess(request, reply, null, 200, result.message);
  },

  async createModifierOption(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = tenantOf(request);
    const { groupId } = validate(groupParamSchema, request.params);
    const body = validate(createModifierOptionSchema, request.body);
    const option = await menuService.createModifierOption(tenantId, groupId, body);
    return sendSuccess(request, reply, option, 201, "Modifier option created successfully");
  },

  async updateModifierOption(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = tenantOf(request);
    const { optionId } = validate(optionParamSchema, request.params);
    const body = validate(updateModifierOptionSchema, request.body);
    const option = await menuService.updateModifierOption(tenantId, optionId, body);
    return sendSuccess(request, reply, option, 200, "Modifier option updated successfully");
  },

  async deleteModifierOption(request: FastifyRequest, reply: FastifyReply) {
    const tenantId = tenantOf(request);
    const { optionId } = validate(optionParamSchema, request.params);
    const result = await menuService.deleteModifierOption(tenantId, optionId);
    return sendSuccess(request, reply, null, 200, result.message);
  },
};
