import type { Role, User } from "@prisma/client";
import { withTransaction } from "../database/prisma.js";
import { BadRequestError, ConflictError, ForbiddenError } from "../lib/errors.js";
import { ErrorCode } from "../constants/error-codes.js";
import { hashPassword, normalizeEmail } from "../lib/password.js";
import type { ActorContext } from "../types/auth.types.js";
import { ensureFound, assertTenantAccess } from "../lib/guards.js";
import { userModel } from "../models/user.model.js";
import { billModel } from "../models/bill.model.js";
import { inventoryTransactionModel } from "../models/inventory.model.js";
import { auditService } from "./audit.service.js";
import { ROLE_DEFAULT_PERMISSIONS } from "../config/permissions.js";
import type {
  CreateUserInput,
  UpdateUserInput,
  ResetPasswordInput,
  UpdatePermissionsInput,
} from "../validations/user.validation.js";

function effectivePermissions(role: Role, explicit: string[]): string[] {
  const defaults = ROLE_DEFAULT_PERMISSIONS[role] || [];
  return Array.from(new Set([...defaults, ...explicit]));
}

function toStaffProfile(user: User & { permissions: { permissionKey: string }[] }) {
  return {
    id: user.id,
    tenantId: user.tenantId,
    name: user.name,
    email: user.email,
    role: user.role,
    phoneNumber: user.phoneNumber,
    isActive: user.isActive,
    tokenVersion: user.tokenVersion,
    permissions: effectivePermissions(user.role, user.permissions.map((p) => p.permissionKey)),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

async function getStaffInScope(actor: ActorContext, id: string): Promise<User> {
  const user = ensureFound(await userModel.findById(id), "Staff member not found");
  assertTenantAccess(actor, user.tenantId);
  return user;
}

export const userService = {
  async listUsers(actor: ActorContext, queryTenantId?: string) {
    const { user: caller } = actor;
    // Only Super Admin can query cross-tenant staff
    const effectiveTenantId =
      caller.role === "SUPER_ADMIN" && queryTenantId ? queryTenantId : caller.tenantId;

    const users = await userModel.findManyWithPermissions(
      caller.role === "SUPER_ADMIN" && !queryTenantId ? undefined : effectiveTenantId
    );

    return users.map(toStaffProfile);
  },

  async createUser(actor: ActorContext, data: CreateUserInput) {
    const { user: caller } = actor;

    if (data.role === "SUPER_ADMIN" && caller.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: only Super Admins can assign the SUPER_ADMIN role");
    }

    const targetTenantId =
      caller.role === "SUPER_ADMIN" && data.tenantId ? data.tenantId : caller.tenantId;

    const normalizedEmail = normalizeEmail(data.email);

    if (await userModel.findByEmail(normalizedEmail)) {
      throw new ConflictError("A user with this email address already exists", ErrorCode.USER_ALREADY_EXISTS);
    }

    // Default secure random password for the invite flow
    const plainPassword = data.password || Math.random().toString(36).slice(-10) + "Aa1!";
    const passwordHash = await hashPassword(plainPassword);

    const newUser = await withTransaction(async (tx) => {
      const u = await userModel.create(
        {
          tenantId: targetTenantId,
          email: normalizedEmail,
          name: data.name,
          role: data.role,
          phoneNumber: data.phoneNumber || null,
          isActive: true,
          passwordHash,
        },
        tx
      );

      if (data.permissions && data.permissions.length > 0) {
        await userModel.addPermissions(u.id, data.permissions, tx);
      }

      return u;
    });

    await auditService.recordAction(actor, {
      tenantId: targetTenantId,
      action: "STAFF_CREATED",
      resource: "users",
      resourceId: newUser.id,
      details: { email: newUser.email, role: newUser.role, name: newUser.name },
    });

    return {
      id: newUser.id,
      tenantId: newUser.tenantId,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      phoneNumber: newUser.phoneNumber,
      isActive: newUser.isActive,
      permissions: effectivePermissions(newUser.role, data.permissions || []),
      initialPassword: data.password ? undefined : plainPassword,
      createdAt: newUser.createdAt.toISOString(),
      updatedAt: newUser.updatedAt.toISOString(),
    };
  },

  async getUser(actor: ActorContext, id: string) {
    const user = ensureFound(await userModel.findByIdWithPermissions(id), "Staff member not found");
    assertTenantAccess(actor, user.tenantId);
    return toStaffProfile(user);
  },

  async updateUser(actor: ActorContext, id: string, data: UpdateUserInput) {
    const { user: caller } = actor;
    const existing = await getStaffInScope(actor, id);

    if (caller.role !== "SUPER_ADMIN" && (data.role === "SUPER_ADMIN" || existing.role === "SUPER_ADMIN")) {
      throw new ForbiddenError("Forbidden: only Super Admins can assign or modify the SUPER_ADMIN role");
    }

    if (caller.id === id && data.role && data.role !== caller.role && caller.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: cannot alter your own administrative role");
    }

    // Deactivation bumps tokenVersion to revoke active sessions
    const revokeSessions = data.isActive === false;

    const updated = await userModel.updateWithPermissions(id, {
      ...(data.name ? { name: data.name } : {}),
      ...(data.phoneNumber !== undefined ? { phoneNumber: data.phoneNumber } : {}),
      ...(data.role ? { role: data.role } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(revokeSessions ? { tokenVersion: { increment: 1 } } : {}),
    });

    await auditService.recordAction(actor, {
      tenantId: existing.tenantId,
      action: "STAFF_UPDATED",
      resource: "users",
      resourceId: id,
      details: data,
    });

    return toStaffProfile(updated);
  },

  async updateRole(actor: ActorContext, id: string, role: Role) {
    const { user: caller } = actor;
    const existing = await getStaffInScope(actor, id);

    if (caller.role !== "SUPER_ADMIN" && (role === "SUPER_ADMIN" || existing.role === "SUPER_ADMIN")) {
      throw new ForbiddenError("Forbidden: cannot assign or modify Super Admin role");
    }

    if (caller.id === id && caller.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: cannot alter your own administrative role");
    }

    const updated = await userModel.update(id, { role, tokenVersion: { increment: 1 } });

    // No ipAddress recorded for role changes
    await auditService.record({
      tenantId: existing.tenantId,
      actorId: caller.id,
      actorEmail: caller.email,
      actorRole: caller.role,
      action: "STAFF_ROLE_UPDATED",
      resource: "USER",
      resourceId: id,
      details: { oldRole: existing.role, newRole: role },
    });

    return {
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
    };
  },

  async updatePermissions(actor: ActorContext, id: string, data: UpdatePermissionsInput) {
    const { user: caller } = actor;
    const user = await getStaffInScope(actor, id);

    if (caller.role !== "SUPER_ADMIN" && user.role === "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: cannot modify Super Admin permissions");
    }

    if (caller.id === id && caller.role !== "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: cannot modify your own administrative permissions");
    }

    const { permissions } = data;

    if (caller.role !== "SUPER_ADMIN" && permissions.includes("tenant.manage")) {
      throw new ForbiddenError("Forbidden: cannot grant platform governance permission");
    }

    await withTransaction(async (tx) => {
      await userModel.deletePermissions(id, tx);
      if (permissions.length > 0) {
        await userModel.addPermissions(id, permissions, tx);
      }
      await userModel.incrementTokenVersion(id, tx);
    });

    await auditService.recordAction(actor, {
      tenantId: user.tenantId,
      action: "PERMISSIONS_UPDATED",
      resource: "users",
      resourceId: id,
      details: { assignedPermissions: permissions },
    });

    return { id, permissions: effectivePermissions(user.role, permissions) };
  },

  async resetPassword(actor: ActorContext, id: string, data: ResetPasswordInput): Promise<void> {
    const { user: caller } = actor;
    const user = await getStaffInScope(actor, id);

    if (caller.role !== "SUPER_ADMIN" && user.role === "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: cannot reset password of Super Admin");
    }

    const passwordHash = await hashPassword(data.newPassword);

    // Bumping tokenVersion invalidates existing sessions
    await userModel.update(id, { passwordHash, tokenVersion: { increment: 1 } });

    await auditService.recordAction(actor, {
      tenantId: user.tenantId,
      action: "STAFF_PASSWORD_RESET",
      resource: "users",
      resourceId: id,
      details: { targetEmail: user.email },
    });
  },

  async revokeSessions(actor: ActorContext, id: string): Promise<void> {
    const user = await getStaffInScope(actor, id);

    await userModel.incrementTokenVersion(id);

    await auditService.recordAction(actor, {
      tenantId: user.tenantId,
      action: "STAFF_SESSIONS_REVOKED",
      resource: "users",
      resourceId: id,
      details: { targetEmail: user.email },
    });
  },

  async deleteUser(actor: ActorContext, id: string) {
    const { user: caller } = actor;

    if (caller.id === id) {
      throw new BadRequestError("Cannot delete your own account", ErrorCode.SELF_DELETION_PROHIBITED);
    }

    const user = await getStaffInScope(actor, id);

    if (caller.role !== "SUPER_ADMIN" && user.role === "SUPER_ADMIN") {
      throw new ForbiddenError("Forbidden: hotel Admins cannot delete Super Admin accounts");
    }

    // Lockout protection: keep at least one active Super Admin
    if (user.role === "SUPER_ADMIN" && (await userModel.countActiveSuperAdminsExcept(id)) === 0) {
      throw new BadRequestError("Cannot delete the last Super Admin account. Platform administration lock-out prevented.", ErrorCode.LAST_SUPER_ADMIN_DELETION_PROHIBITED);
    }

    // Tenant lockout protection: keep at least one active Admin per tenant
    if (user.role === "ADMIN" && (await userModel.countActiveAdminsExcept(user.tenantId, id)) === 0) {
      throw new BadRequestError("Cannot delete the last Admin account for this property. Administration lock-out prevented.", ErrorCode.LAST_ADMIN_DELETION_PROHIBITED);
    }

    const paymentCount = await billModel.countPaymentsReceivedBy(id);
    const inventoryCount = await inventoryTransactionModel.countPerformedBy(id);
    const hasHistoricalReferences = paymentCount > 0 || inventoryCount > 0;
    const strategy = hasHistoricalReferences ? "ANONYMIZED_ARCHIVE" : "PERMANENT_REMOVAL";

    await withTransaction(async (tx) => {
      await userModel.deletePermissions(id, tx);
      if (hasHistoricalReferences) {
        // Anonymize to preserve genuine financial history
        await userModel.update(
          id,
          {
            name: `[Deleted] ${user.name.slice(0, 30)}`,
            email: `deleted-${user.id.slice(0, 8)}@archived.local`,
            phoneNumber: null,
            isActive: false,
            tokenVersion: { increment: 10 },
            passwordHash: "DELETED_ACCOUNT_CREDENTIALS_INVALIDATED",
          },
          tx
        );
      } else {
        await userModel.delete(id, tx);
      }
    });

    await auditService.recordAction(actor, {
      tenantId: user.tenantId,
      action: "STAFF_DELETED",
      resource: "users",
      resourceId: id,
      details: {
        targetEmail: user.email,
        targetRole: user.role,
        targetName: user.name,
        strategy,
      },
    });

    return { id, deleted: true, strategy };
  },
};
