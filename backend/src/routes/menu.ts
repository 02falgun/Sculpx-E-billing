import type { FastifyPluginAsync } from "fastify";
import { formatSuccessResponse, AppError } from "../lib/errors.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { menuService } from "../services/menu.service.js";
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
} from "../schemas/menu.schema.js";

function validate<T>(schema: { safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: { issues: Array<{ path: Array<string | number>; message: string }> } } }, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      issue: issue.message,
    }));
    throw new AppError("Request validation failed", 400, "VALIDATION_FAILED", details);
  }
  return result.data;
}

import { qrService } from "../services/qr.service.js";

export const menuRoutes: FastifyPluginAsync = async (fastify) => {
  // Menu operations require authenticated staff context or valid QR token context for reads
  fastify.addHook("preHandler", async (request, reply) => {
    // 1. Context endpoint is always public
    if (request.url.includes("/context/")) {
      return;
    }

    // 2. If Authorization header is present, verify staff JWT
    if (request.headers.authorization) {
      await authenticate(request, reply);
      return;
    }

    // 3. For read-only GET requests, allow resolution via x-qr-token or ?qrToken
    const qrToken = (request.headers["x-qr-token"] || (request.query as any)?.qrToken) as string | undefined;
    if (request.method === "GET" && qrToken) {
      try {
        const validated = await qrService.resolveValidatedQrEntity(qrToken);
        request.authenticatedUser = {
          id: `guest-${validated.type.toLowerCase()}-${validated.qr.token}`,
          tenantId: validated.tenantId,
          email: `guest@${validated.type.toLowerCase()}.local`,
          name: `Guest (${validated.type})`,
          role: "WAITER" as any,
          isActive: true,
          tokenVersion: 1,
          permissions: [],
        };
        return;
      } catch {
        throw new AppError("Invalid or expired QR token", 401, "UNAUTHORIZED");
      }
    }

    // 4. Default: enforce staff authentication
    await authenticate(request, reply);
  });

  /**
   * GET /context/:token
   * Public QR Context resolution alias for customer menu entry
   */
  fastify.get("/context/:token", async (request, reply) => {
    const { token } = request.params as { token: string };
    const qrContext = await qrService.resolvePublicQrContext(token);
    return reply.status(200).send(formatSuccessResponse(qrContext, request));
  });

  // ==========================================
  // Categories Endpoints
  // ==========================================

  /**
   * GET /categories
   * List menu categories for the current tenant
   */
  fastify.get("/categories", async (request, reply) => {
    const tenantId = request.authenticatedUser!.tenantId;
    const query = validate(categoryListQuerySchema, request.query);
    const categories = await menuService.listCategories(tenantId, query);
    return reply.status(200).send(formatSuccessResponse(categories, request));
  });

  /**
   * GET /categories/:id
   * Get single menu category by ID
   */
  fastify.get("/categories/:id", async (request, reply) => {
    const tenantId = request.authenticatedUser!.tenantId;
    const { id } = validate(idParamSchema, request.params);
    const category = await menuService.getCategoryById(tenantId, id);
    return reply.status(200).send(formatSuccessResponse(category, request));
  });

  /**
   * POST /categories
   * Create a new menu category (Admin / Super Admin only)
   */
  fastify.post(
    "/categories",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const tenantId = request.authenticatedUser!.tenantId;
      const body = validate(createCategorySchema, request.body);
      const category = await menuService.createCategory(tenantId, body);
      return reply
        .status(201)
        .send(formatSuccessResponse(category, request, "Category created successfully"));
    }
  );

  /**
   * PATCH /categories/:id
   * Update menu category (Admin / Super Admin only)
   */
  fastify.patch(
    "/categories/:id",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const tenantId = request.authenticatedUser!.tenantId;
      const { id } = validate(idParamSchema, request.params);
      const body = validate(updateCategorySchema, request.body);
      const category = await menuService.updateCategory(tenantId, id, body);
      return reply
        .status(200)
        .send(formatSuccessResponse(category, request, "Category updated successfully"));
    }
  );

  /**
   * DELETE /categories/:id
   * Delete or deactivate category (Admin / Super Admin only)
   */
  fastify.delete(
    "/categories/:id",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const tenantId = request.authenticatedUser!.tenantId;
      const { id } = validate(idParamSchema, request.params);
      const result = await menuService.deleteCategory(tenantId, id);
      return reply.status(200).send(formatSuccessResponse(null, request, result.message));
    }
  );

  // ==========================================
  // Menu Items Endpoints
  // ==========================================

  /**
   * GET /items
   * List menu items with pagination and filters
   */
  fastify.get("/items", async (request, reply) => {
    const tenantId = request.authenticatedUser!.tenantId;
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
  });

  /**
   * GET /items/:id
   * Get single menu item by ID
   */
  fastify.get("/items/:id", async (request, reply) => {
    const tenantId = request.authenticatedUser!.tenantId;
    const { id } = validate(idParamSchema, request.params);
    const item = await menuService.getMenuItemById(tenantId, id);
    return reply.status(200).send(formatSuccessResponse(item, request));
  });

  /**
   * POST /items
   * Create a new menu item with optional modifier groups (Admin / Super Admin only)
   */
  fastify.post(
    "/items",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const tenantId = request.authenticatedUser!.tenantId;
      const body = validate(createMenuItemSchema, request.body);
      const item = await menuService.createMenuItem(tenantId, body);
      return reply
        .status(201)
        .send(formatSuccessResponse(item, request, "Menu item created successfully"));
    }
  );

  /**
   * PATCH /items/:id
   * Update menu item (Admin / Super Admin only)
   */
  fastify.patch(
    "/items/:id",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const tenantId = request.authenticatedUser!.tenantId;
      const { id } = validate(idParamSchema, request.params);
      const body = validate(updateMenuItemSchema, request.body);
      const item = await menuService.updateMenuItem(tenantId, id, body);
      return reply
        .status(200)
        .send(formatSuccessResponse(item, request, "Menu item updated successfully"));
    }
  );

  /**
   * DELETE /items/:id
   * Delete or deactivate menu item (Admin / Super Admin only)
   */
  fastify.delete(
    "/items/:id",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const tenantId = request.authenticatedUser!.tenantId;
      const { id } = validate(idParamSchema, request.params);
      const result = await menuService.deleteMenuItem(tenantId, id);
      return reply.status(200).send(formatSuccessResponse(null, request, result.message));
    }
  );

  // ==========================================
  // Modifier Groups & Options Endpoints
  // ==========================================

  /**
   * GET /items/:itemId/modifier-groups
   * List modifier groups for a menu item
   */
  fastify.get("/items/:itemId/modifier-groups", async (request, reply) => {
    const tenantId = request.authenticatedUser!.tenantId;
    const { itemId } = validate(itemParamSchema, request.params);
    const groups = await menuService.listModifierGroups(tenantId, itemId);
    return reply.status(200).send(formatSuccessResponse(groups, request));
  });

  /**
   * POST /items/:itemId/modifier-groups
   * Add a modifier group to a menu item (Admin / Super Admin only)
   */
  fastify.post(
    "/items/:itemId/modifier-groups",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const tenantId = request.authenticatedUser!.tenantId;
      const { itemId } = validate(itemParamSchema, request.params);
      const body = validate(createModifierGroupSchema, request.body);
      const group = await menuService.createModifierGroup(tenantId, itemId, body);
      return reply
        .status(201)
        .send(formatSuccessResponse(group, request, "Modifier group created successfully"));
    }
  );

  /**
   * PATCH /modifier-groups/:groupId
   * Update a modifier group (Admin / Super Admin only)
   */
  fastify.patch(
    "/modifier-groups/:groupId",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const tenantId = request.authenticatedUser!.tenantId;
      const { groupId } = validate(groupParamSchema, request.params);
      const body = validate(updateModifierGroupSchema, request.body);
      const group = await menuService.updateModifierGroup(tenantId, groupId, body);
      return reply
        .status(200)
        .send(formatSuccessResponse(group, request, "Modifier group updated successfully"));
    }
  );

  /**
   * DELETE /modifier-groups/:groupId
   * Delete a modifier group (Admin / Super Admin only)
   */
  fastify.delete(
    "/modifier-groups/:groupId",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const tenantId = request.authenticatedUser!.tenantId;
      const { groupId } = validate(groupParamSchema, request.params);
      const result = await menuService.deleteModifierGroup(tenantId, groupId);
      return reply.status(200).send(formatSuccessResponse(null, request, result.message));
    }
  );

  /**
   * POST /modifier-groups/:groupId/options
   * Add a modifier option to a group (Admin / Super Admin only)
   */
  fastify.post(
    "/modifier-groups/:groupId/options",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const tenantId = request.authenticatedUser!.tenantId;
      const { groupId } = validate(groupParamSchema, request.params);
      const body = validate(createModifierOptionSchema, request.body);
      const option = await menuService.createModifierOption(tenantId, groupId, body);
      return reply
        .status(201)
        .send(formatSuccessResponse(option, request, "Modifier option created successfully"));
    }
  );

  /**
   * PATCH /modifier-options/:optionId
   * Update a modifier option (Admin / Super Admin only)
   */
  fastify.patch(
    "/modifier-options/:optionId",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const tenantId = request.authenticatedUser!.tenantId;
      const { optionId } = validate(optionParamSchema, request.params);
      const body = validate(updateModifierOptionSchema, request.body);
      const option = await menuService.updateModifierOption(tenantId, optionId, body);
      return reply
        .status(200)
        .send(formatSuccessResponse(option, request, "Modifier option updated successfully"));
    }
  );

  /**
   * DELETE /modifier-options/:optionId
   * Delete a modifier option (Admin / Super Admin only)
   */
  fastify.delete(
    "/modifier-options/:optionId",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const tenantId = request.authenticatedUser!.tenantId;
      const { optionId } = validate(optionParamSchema, request.params);
      const result = await menuService.deleteModifierOption(tenantId, optionId);
      return reply.status(200).send(formatSuccessResponse(null, request, result.message));
    }
  );
};
