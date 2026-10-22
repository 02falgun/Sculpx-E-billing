import type { FastifyPluginAsync } from "fastify";
import { requireRoles } from "../middleware/auth.js";
import { menuQrGuestAuth } from "../middleware/qr-guest-auth.js";
import { menuController } from "../controllers/menu.controller.js";

const menuAdmins = requireRoles("ADMIN", "SUPER_ADMIN");

export const menuRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", menuQrGuestAuth);

  // Public QR context resolution alias for customer menu entry
  fastify.get("/context/:token", menuController.getQrContext);

  // Categories
  fastify.get("/categories", menuController.listCategories);
  fastify.get("/categories/:id", menuController.getCategory);
  fastify.post("/categories", { preHandler: [menuAdmins] }, menuController.createCategory);
  fastify.patch("/categories/:id", { preHandler: [menuAdmins] }, menuController.updateCategory);
  fastify.delete("/categories/:id", { preHandler: [menuAdmins] }, menuController.deleteCategory);

  // Menu items
  fastify.get("/items", menuController.listMenuItems);
  fastify.get("/items/:id", menuController.getMenuItem);
  fastify.post("/items", { preHandler: [menuAdmins] }, menuController.createMenuItem);
  fastify.patch("/items/:id", { preHandler: [menuAdmins] }, menuController.updateMenuItem);
  fastify.delete("/items/:id", { preHandler: [menuAdmins] }, menuController.deleteMenuItem);

  // Modifier groups & options
  fastify.get("/items/:itemId/modifier-groups", menuController.listModifierGroups);
  fastify.post(
    "/items/:itemId/modifier-groups",
    { preHandler: [menuAdmins] },
    menuController.createModifierGroup
  );
  fastify.patch(
    "/modifier-groups/:groupId",
    { preHandler: [menuAdmins] },
    menuController.updateModifierGroup
  );
  fastify.delete(
    "/modifier-groups/:groupId",
    { preHandler: [menuAdmins] },
    menuController.deleteModifierGroup
  );
  fastify.post(
    "/modifier-groups/:groupId/options",
    { preHandler: [menuAdmins] },
    menuController.createModifierOption
  );
  fastify.patch(
    "/modifier-options/:optionId",
    { preHandler: [menuAdmins] },
    menuController.updateModifierOption
  );
  fastify.delete(
    "/modifier-options/:optionId",
    { preHandler: [menuAdmins] },
    menuController.deleteModifierOption
  );
};
