import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { hashPassword, normalizeEmail } from "../lib/password.js";
import { formatSuccessResponse, AppError } from "../lib/errors.js";
import { authenticate, requireRoles, requirePermissions } from "../middleware/auth.js";
import { auditService } from "../services/audit.service.js";
import { Role } from "@prisma/client";
import { ROLE_DEFAULT_PERMISSIONS } from "../config/permissions.js";

const createUserSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  name: z.string().min(1, "Name is required").max(255),
  role: z.nativeEnum(Role),
  phoneNumber: z.string().optional().nullable(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  permissions: z.array(z.string()).optional(),
  tenantId: z.string().uuid().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phoneNumber: z.string().optional().nullable(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

const updatePermissionsSchema = z.object({
  permissions: z.array(z.string()),
});

export const userRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  /**
   * GET /
   * List staff members belonging to caller's tenant.
   */
  fastify.get(
    "/",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER")] },
    async (request, reply) => {
      const caller = request.authenticatedUser!;
      const queryTenantId = (request.query as { tenantId?: string })?.tenantId;

      // Only Super Admin can query cross-tenant staff
      const effectiveTenantId =
        caller.role === "SUPER_ADMIN" && queryTenantId ? queryTenantId : caller.tenantId;

      const users = await prisma.user.findMany({
        where: caller.role === "SUPER_ADMIN" && !queryTenantId ? {} : { tenantId: effectiveTenantId },
        include: {
          permissions: {
            select: { permissionKey: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const formatted = users.map((u) => {
        const explicit = u.permissions.map((p) => p.permissionKey);
        const defaults = ROLE_DEFAULT_PERMISSIONS[u.role] || [];
        const combined = Array.from(new Set([...defaults, ...explicit]));

        return {
          id: u.id,
          tenantId: u.tenantId,
          name: u.name,
          email: u.email,
          role: u.role,
          phoneNumber: u.phoneNumber,
          isActive: u.isActive,
          tokenVersion: u.tokenVersion,
          permissions: combined,
          createdAt: u.createdAt.toISOString(),
          updatedAt: u.updatedAt.toISOString(),
        };
      });

      return reply.status(200).send(formatSuccessResponse(formatted, request));
    }
  );

  /**
   * POST /
   * Create new staff account.
   */
  fastify.post(
    "/",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const caller = request.authenticatedUser!;
      const parseResult = createUserSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new AppError(
          "Validation failed",
          400,
          "VALIDATION_FAILED",
          parseResult.error.issues.map((i) => ({ field: i.path.join("."), issue: i.message }))
        );
      }

      const data = parseResult.data;

      // Prevent non-superadmins from creating superadmins
      if (data.role === "SUPER_ADMIN" && caller.role !== "SUPER_ADMIN") {
        throw new AppError("Forbidden: only Super Admins can assign the SUPER_ADMIN role", 403, "FORBIDDEN");
      }

      // Determine target tenant ID
      const targetTenantId =
        caller.role === "SUPER_ADMIN" && data.tenantId ? data.tenantId : caller.tenantId;

      const normalizedEmail = normalizeEmail(data.email);

      // Check email uniqueness
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existing) {
        throw new AppError("A user with this email address already exists", 409, "USER_ALREADY_EXISTS");
      }

      // Hash password (or default secure random password if invite flow)
      const plainPassword = data.password || Math.random().toString(36).slice(-10) + "Aa1!";
      const passwordHash = await hashPassword(plainPassword);

      // Create user and permissions in a transaction
      const newUser = await prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            tenantId: targetTenantId,
            email: normalizedEmail,
            name: data.name,
            role: data.role,
            phoneNumber: data.phoneNumber || null,
            isActive: true,
            passwordHash,
          },
        });

        if (data.permissions && data.permissions.length > 0) {
          await tx.userPermission.createMany({
            data: data.permissions.map((p) => ({
              userId: u.id,
              permissionKey: p,
            })),
            skipDuplicates: true,
          });
        }

        return u;
      });

      await auditService.record({
        tenantId: targetTenantId,
        actorId: caller.id,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "STAFF_CREATED",
        resource: "users",
        resourceId: newUser.id,
        details: { email: newUser.email, role: newUser.role, name: newUser.name },
        ipAddress: request.ip,
      });

      const explicit = data.permissions || [];
      const defaults = ROLE_DEFAULT_PERMISSIONS[newUser.role] || [];
      const combined = Array.from(new Set([...defaults, ...explicit]));

      const responsePayload = {
        id: newUser.id,
        tenantId: newUser.tenantId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phoneNumber: newUser.phoneNumber,
        isActive: newUser.isActive,
        permissions: combined,
        initialPassword: data.password ? undefined : plainPassword,
        createdAt: newUser.createdAt.toISOString(),
        updatedAt: newUser.updatedAt.toISOString(),
      };

      return reply
        .status(201)
        .send(formatSuccessResponse(responsePayload, request, "Staff account created successfully"));
    }
  );

  /**
   * GET /:id
   * Get single staff profile.
   */
  fastify.get(
    "/:id",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN", "MANAGER")] },
    async (request, reply) => {
      const caller = request.authenticatedUser!;
      const { id } = request.params as { id: string };

      const user = await prisma.user.findUnique({
        where: { id },
        include: { permissions: { select: { permissionKey: true } } },
      });

      if (!user) {
        throw new AppError("Staff member not found", 404, "NOT_FOUND");
      }

      if (caller.role !== "SUPER_ADMIN" && user.tenantId !== caller.tenantId) {
        throw new AppError("Forbidden: cross-tenant access denied", 403, "FORBIDDEN");
      }

      const explicit = user.permissions.map((p) => p.permissionKey);
      const defaults = ROLE_DEFAULT_PERMISSIONS[user.role] || [];
      const combined = Array.from(new Set([...defaults, ...explicit]));

      return reply.status(200).send(
        formatSuccessResponse(
          {
            id: user.id,
            tenantId: user.tenantId,
            name: user.name,
            email: user.email,
            role: user.role,
            phoneNumber: user.phoneNumber,
            isActive: user.isActive,
            tokenVersion: user.tokenVersion,
            permissions: combined,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
          },
          request
        )
      );
    }
  );

  /**
   * PATCH /:id
   * Update staff name, phone, role, or active status.
   */
  fastify.patch(
    "/:id",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const caller = request.authenticatedUser!;
      const { id } = request.params as { id: string };

      const parseResult = updateUserSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new AppError(
          "Validation failed",
          400,
          "VALIDATION_FAILED",
          parseResult.error.issues.map((i) => ({ field: i.path.join("."), issue: i.message }))
        );
      }

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError("Staff member not found", 404, "NOT_FOUND");
      }

      if (caller.role !== "SUPER_ADMIN" && existing.tenantId !== caller.tenantId) {
        throw new AppError("Forbidden: cross-tenant access denied", 403, "FORBIDDEN");
      }

      const data = parseResult.data;

      // Prevent non-superadmins from escalating anyone to SUPER_ADMIN
      if (data.role === "SUPER_ADMIN" && caller.role !== "SUPER_ADMIN") {
        throw new AppError("Forbidden: only Super Admins can assign the SUPER_ADMIN role", 403, "FORBIDDEN");
      }

      // If user is deactivated, increment tokenVersion to revoke active sessions
      const tokenVersionIncrement = data.isActive === false ? 1 : 0;

      const updated = await prisma.user.update({
        where: { id },
        data: {
          ...(data.name ? { name: data.name } : {}),
          ...(data.phoneNumber !== undefined ? { phoneNumber: data.phoneNumber } : {}),
          ...(data.role ? { role: data.role } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
          ...(tokenVersionIncrement > 0 ? { tokenVersion: { increment: tokenVersionIncrement } } : {}),
        },
        include: { permissions: { select: { permissionKey: true } } },
      });

      await auditService.record({
        tenantId: existing.tenantId,
        actorId: caller.id,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "STAFF_UPDATED",
        resource: "users",
        resourceId: id,
        details: data,
        ipAddress: request.ip,
      });

      const explicit = updated.permissions.map((p) => p.permissionKey);
      const defaults = ROLE_DEFAULT_PERMISSIONS[updated.role] || [];
      const combined = Array.from(new Set([...defaults, ...explicit]));

      return reply.status(200).send(
        formatSuccessResponse(
          {
            id: updated.id,
            tenantId: updated.tenantId,
            name: updated.name,
            email: updated.email,
            role: updated.role,
            phoneNumber: updated.phoneNumber,
            isActive: updated.isActive,
            tokenVersion: updated.tokenVersion,
            permissions: combined,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
          },
          request,
          "Staff member updated successfully"
        )
      );
    }
  );

  /**
   * PATCH /:id/role
   * Specific role update endpoint for staff.
   */
  fastify.patch(
    "/:id/role",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const caller = request.authenticatedUser!;
      const { id } = request.params as { id: string };
      const body = request.body as { role: Role };

      if (!body.role || !Object.values(Role).includes(body.role)) {
        throw new AppError("Invalid role provided", 400, "VALIDATION_FAILED");
      }

      const existing = await prisma.user.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError("Staff member not found", 404, "NOT_FOUND");
      }

      if (caller.role !== "SUPER_ADMIN" && existing.tenantId !== caller.tenantId) {
        throw new AppError("Forbidden: cross-tenant access denied", 403, "FORBIDDEN");
      }

      if (caller.role !== "SUPER_ADMIN" && (body.role === "SUPER_ADMIN" || existing.role === "SUPER_ADMIN")) {
        throw new AppError("Forbidden: cannot assign or modify Super Admin role", 403, "FORBIDDEN");
      }

      const updated = await prisma.user.update({
        where: { id },
        data: {
          role: body.role,
          tokenVersion: { increment: 1 },
        },
      });

      await auditService.record({
        tenantId: existing.tenantId,
        actorId: caller.id,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "STAFF_ROLE_UPDATED",
        resource: "USER",
        resourceId: id,
        details: { oldRole: existing.role, newRole: body.role },
      });

      return reply.status(200).send(
        formatSuccessResponse(
          {
            id: updated.id,
            tenantId: updated.tenantId,
            name: updated.name,
            email: updated.email,
            role: updated.role,
            phoneNumber: updated.phoneNumber,
            isActive: updated.isActive,
            tokenVersion: updated.tokenVersion,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
          },
          request,
          "Role updated successfully"
        )
      );
    }
  );

  /**
   * PUT /:id/permissions
   * Update granular permissions for a staff member.
   */
  fastify.put(
    "/:id/permissions",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const caller = request.authenticatedUser!;
      const { id } = request.params as { id: string };

      const parseResult = updatePermissionsSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new AppError("Invalid permissions payload", 400, "VALIDATION_FAILED");
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw new AppError("Staff member not found", 404, "NOT_FOUND");
      }

      if (caller.role !== "SUPER_ADMIN" && user.tenantId !== caller.tenantId) {
        throw new AppError("Forbidden: cross-tenant access denied", 403, "FORBIDDEN");
      }

      const { permissions } = parseResult.data;

      // Update permissions and bump tokenVersion in a transaction
      await prisma.$transaction(async (tx) => {
        await tx.userPermission.deleteMany({ where: { userId: id } });
        if (permissions.length > 0) {
          await tx.userPermission.createMany({
            data: permissions.map((p) => ({
              userId: id,
              permissionKey: p,
            })),
            skipDuplicates: true,
          });
        }
        await tx.user.update({
          where: { id },
          data: { tokenVersion: { increment: 1 } },
        });
      });

      await auditService.record({
        tenantId: user.tenantId,
        actorId: caller.id,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "PERMISSIONS_UPDATED",
        resource: "users",
        resourceId: id,
        details: { assignedPermissions: permissions },
        ipAddress: request.ip,
      });

      const defaults = ROLE_DEFAULT_PERMISSIONS[user.role] || [];
      const combined = Array.from(new Set([...defaults, ...permissions]));

      return reply.status(200).send(
        formatSuccessResponse(
          { id, permissions: combined },
          request,
          "Permissions updated successfully"
        )
      );
    }
  );

  /**
   * POST /:id/reset-password
   * Secure administrator-controlled password reset.
   */
  fastify.post(
    "/:id/reset-password",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const caller = request.authenticatedUser!;
      const { id } = request.params as { id: string };

      const parseResult = resetPasswordSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw new AppError("Invalid password payload", 400, "VALIDATION_FAILED");
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw new AppError("Staff member not found", 404, "NOT_FOUND");
      }

      if (caller.role !== "SUPER_ADMIN" && user.tenantId !== caller.tenantId) {
        throw new AppError("Forbidden: cross-tenant access denied", 403, "FORBIDDEN");
      }

      // Hotel Admin cannot reset Super Admin passwords
      if (user.role === "SUPER_ADMIN" && caller.role !== "SUPER_ADMIN") {
        throw new AppError("Forbidden: cannot reset a Super Admin account", 403, "FORBIDDEN");
      }

      const passwordHash = await hashPassword(parseResult.data.newPassword);

      await prisma.user.update({
        where: { id },
        data: {
          passwordHash,
          tokenVersion: { increment: 1 }, // Invalidate existing sessions
        },
      });

      await auditService.record({
        tenantId: user.tenantId,
        actorId: caller.id,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "STAFF_PASSWORD_RESET",
        resource: "users",
        resourceId: id,
        details: { targetEmail: user.email },
        ipAddress: request.ip,
      });

      return reply
        .status(200)
        .send(formatSuccessResponse(null, request, "Password reset successfully. Active sessions revoked."));
    }
  );

  /**
   * POST /:id/revoke-sessions
   * Invalidate all active sessions for a staff member.
   */
  fastify.post(
    "/:id/revoke-sessions",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const caller = request.authenticatedUser!;
      const { id } = request.params as { id: string };

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw new AppError("Staff member not found", 404, "NOT_FOUND");
      }

      if (caller.role !== "SUPER_ADMIN" && user.tenantId !== caller.tenantId) {
        throw new AppError("Forbidden: cross-tenant access denied", 403, "FORBIDDEN");
      }

      await prisma.user.update({
        where: { id },
        data: { tokenVersion: { increment: 1 } },
      });

      await auditService.record({
        tenantId: user.tenantId,
        actorId: caller.id,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "STAFF_SESSIONS_REVOKED",
        resource: "users",
        resourceId: id,
        details: { targetEmail: user.email },
        ipAddress: request.ip,
      });

      return reply.status(200).send(formatSuccessResponse(null, request, "Sessions revoked successfully"));
    }
  );

  /**
   * DELETE /:id
   * Deactivate staff account.
   */
  fastify.delete(
    "/:id",
    { preHandler: [requireRoles("ADMIN", "SUPER_ADMIN")] },
    async (request, reply) => {
      const caller = request.authenticatedUser!;
      const { id } = request.params as { id: string };

      if (caller.id === id) {
        throw new AppError("Cannot deactivate your own account", 400, "SELF_DEACTIVATION_PROHIBITED");
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        throw new AppError("Staff member not found", 404, "NOT_FOUND");
      }

      if (caller.role !== "SUPER_ADMIN" && user.tenantId !== caller.tenantId) {
        throw new AppError("Forbidden: cross-tenant access denied", 403, "FORBIDDEN");
      }

      await prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          tokenVersion: { increment: 1 },
        },
      });

      await auditService.record({
        tenantId: user.tenantId,
        actorId: caller.id,
        actorEmail: caller.email,
        actorRole: caller.role,
        action: "STAFF_DEACTIVATED",
        resource: "users",
        resourceId: id,
        details: { targetEmail: user.email },
        ipAddress: request.ip,
      });

      return reply.status(200).send(formatSuccessResponse(null, request, "Staff member deactivated successfully"));
    }
  );
};
