import type { FastifyPluginAsync } from "fastify";
import { requireRoles } from "../middleware/auth.js";
import { inventoryController } from "../controllers/inventory.controller.js";

const inventoryManagers = requireRoles("ADMIN", "MANAGER", "SUPER_ADMIN");
const inventoryViewers = requireRoles("ADMIN", "MANAGER", "SUPER_ADMIN", "KITCHEN_STAFF");

export const inventoryRoutes: FastifyPluginAsync = async (fastify) => {
  // Inventory items
  fastify.get(
    "/items",
    { preHandler: [requireRoles("ADMIN", "MANAGER", "SUPER_ADMIN", "KITCHEN_STAFF", "CASHIER")] },
    inventoryController.listItems
  );
  fastify.get("/items/:id", { preHandler: [inventoryViewers] }, inventoryController.getItem);
  fastify.post("/items", { preHandler: [inventoryManagers] }, inventoryController.createItem);
  fastify.patch("/items/:id", { preHandler: [inventoryManagers] }, inventoryController.updateItem);

  // Stock movements
  fastify.post("/adjustments", { preHandler: [inventoryManagers] }, inventoryController.recordAdjustment);
  fastify.get("/transactions", { preHandler: [inventoryManagers] }, inventoryController.listTransactions);

  // Recipes (BOM)
  fastify.get("/recipes", { preHandler: [inventoryViewers] }, inventoryController.listRecipes);
  fastify.get("/recipes/:menuItemId", { preHandler: [inventoryViewers] }, inventoryController.getRecipe);
  fastify.post("/recipes", { preHandler: [inventoryManagers] }, inventoryController.upsertRecipe);
};
