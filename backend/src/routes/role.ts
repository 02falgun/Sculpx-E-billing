import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { formatSuccessResponse, AppError } from "../lib/errors.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { auditService } from "../services/audit.service.js";
import { PERMISSION_CATALOG, ROLE_DEFAULT_PERMISSIONS } from "../config/permissions.js";
import { Role } from "@prisma/client";

const createCustomRoleSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters").max(100),
  description: z.string().max(255).optional().nullable(),
  baseRole: z.nativeEnum(Role).default("WAITER"),
  permissions: z.array(z.string()).default([]),
});

const updateCustomRoleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(255).optional().nullable(),
  baseRole: z.nativeEnum(Role).optional(),
  permissions: z.array(z.string()).optional(),
});

export const roleRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  /**
   * GET /catalog
   * Return centralized permission catalog and default built-in role maps.
   */
  fastify.get("/catalog", async (request, reply) => {
    return reply.status(200).send(
      formatSuccessResponse(
        {
          catalog: PERMISSION_CATALOG,
          roleDefaults: ROLE_DEFAULT_PERMISSIONS,
          roles: Object.keys(ROLE_DEFAULT_PERMISSIONS),
        },
        request
      )
    );
  });

  /**
   * GET /custom
   * List custom roles for current hotel tenant.
   */
  fastify.get(
    "/custom",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER")] },
    async (request, reply) => {
      const caller = request.authenticatedUser!;

      const customRoles = await prisma.customRole.findMany({
        where: caller.role === "SUPER_ADMIN" ? {} : { tenantId: caller.tenantId },
        orderBy: { createdAt: "desc" },
      });

      return reply.status(200).send(formatSuccessResponse(customRoles, request));
    }
  );

  /**
   * POST /custom
   * Create custom role within current tenant.
   */
  fastify.post(
    "/custom",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const caller = request.authenticatedUser!;
      const parseResult = createCustomRoleSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new AppError(
          "Validation failed",
          400,
          "VALIDATION_FAILED",
          parseResult.error.issues.map((i) => ({ field: i.path.join("."), issue: i.message }))
        );
      }

      const data = parseResult.data;

      // Prevent non-superadmins from adding tenant.manage to custom roles
      if (data.permissions.includes("tenant.manage") && caller.role !== "SUPER_ADMIN") {
        throw new AppError("Forbidden: cannot grant platform governance permission", 403, "FORBIDDEN");
      }

      // Check uniqueness within tenant
      const existing = await prisma.customRole.findUnique({
        where: {
          tenantId_name: {
            tenantId: caller.tenantId,
            name: data.name,
          },
        },
      });

      if (existing) {
        throw new AppError(`A custom role named '${data.name}' already exists in your hotel`, 409, "ROLE_EXISTS");
      }

      const role = await prisma.customRole.create({
        data: {
          tenantId: caller.tenantId,
          name: data.name,
          description: data.description || null,
          baseRole: data.baseRole,
          permissions: data.permissions,
        },
      });

      await auditService.record({
        tenantId: caller.tenantId,
        actorId: caller.id,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "CUSTOM_ROLE_CREATED",
        resource: "custom_roles",
        resourceId: role.id,
        details: { name: role.name, permissionsCount: role.permissions.length },
        ipAddress: request.ip,
      });

      return reply
        .status(201)
        .send(formatSuccessResponse(role, request, "Custom role created successfully"));
    }
  );

  /**
   * PATCH /custom/:id
   * Update custom role.
   */
  fastify.patch(
    "/custom/:id",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const caller = request.authenticatedUser!;
      const { id } = request.params as { id: string };

      const parseResult = updateCustomRoleSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new AppError("Validation failed", 400, "VALIDATION_FAILED");
      }

      const existing = await prisma.customRole.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError("Custom role not found", 404, "NOT_FOUND");
      }

      if (caller.role !== "SUPER_ADMIN" && existing.tenantId !== caller.tenantId) {
        throw new AppError("Forbidden: cross-tenant access denied", 403, "FORBIDDEN");
      }

      const data = parseResult.data;
      if (data.permissions?.includes("tenant.manage") && caller.role !== "SUPER_ADMIN") {
        throw new AppError("Forbidden: cannot grant platform governance permission", 403, "FORBIDDEN");
      }

      const updated = await prisma.customRole.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.baseRole ? { baseRole: data.baseRole } : {}),
          ...(data.permissions ? { permissions: data.permissions } : {}),
        },
      });

      await auditService.record({
        tenantId: existing.tenantId,
        actorId: caller.id,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "CUSTOM_ROLE_UPDATED",
        resource: "custom_roles",
        resourceId: id,
        details: data,
        ipAddress: request.ip,
      });

      return reply.status(200).send(formatSuccessResponse(updated, request, "Custom role updated"));
    }
  );

  /**
   * DELETE /custom/:id
   * Delete custom role.
   */
  fastify.delete(
    "/custom/:id",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const caller = request.authenticatedUser!;
      const { id } = request.params as { id: string };

      const existing = await prisma.customRole.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError("Custom role not found", 404, "NOT_FOUND");
      }

      if (caller.role !== "SUPER_ADMIN" && existing.tenantId !== caller.tenantId) {
        throw new AppError("Forbidden: cross-tenant access denied", 403, "FORBIDDEN");
      }

      await prisma.customRole.delete({ where: { id } });

      await auditService.record({
        tenantId: existing.tenantId,
        actorId: caller.id,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "CUSTOM_ROLE_DELETED",
        resource: "custom_roles",
        resourceId: id,
        details: { name: existing.name },
        ipAddress: request.ip,
      });

      return reply.status(200).send(formatSuccessResponse(null, request, "Custom role deleted successfully"));
    }
  );
};
