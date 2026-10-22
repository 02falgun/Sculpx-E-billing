import { ConflictError, ForbiddenError } from "../lib/errors.js";
import { ErrorCode } from "../constants/error-codes.js";
import type { ActorContext } from "../types/auth.types.js";
import { ensureFound, assertTenantAccess } from "../lib/guards.js";
import { roleModel } from "../models/role.model.js";
import { auditService } from "./audit.service.js";
import { PERMISSION_CATALOG, ROLE_DEFAULT_PERMISSIONS } from "../config/permissions.js";
import type {
  CreateCustomRoleInput,
  UpdateCustomRoleInput,
} from "../validations/role.validation.js";

const PLATFORM_PERMISSION = "tenant.manage";

function assertCanGrant(actor: ActorContext, permissions: string[] | undefined): void {
  if (permissions?.includes(PLATFORM_PERMISSION) && actor.user.role !== "SUPER_ADMIN") {
    throw new ForbiddenError("Forbidden: cannot grant platform governance permission");
  }
}

async function getOwnedRole(actor: ActorContext, id: string) {
  const role = ensureFound(await roleModel.findById(id), "Custom role not found");
  assertTenantAccess(actor, role.tenantId);
  return role;
}

export const roleService = {
  getCatalog() {
    return {
      catalog: PERMISSION_CATALOG,
      roleDefaults: ROLE_DEFAULT_PERMISSIONS,
      roles: Object.keys(ROLE_DEFAULT_PERMISSIONS),
    };
  },

  listCustomRoles(actor: ActorContext) {
    return roleModel.findMany(actor.user.role === "SUPER_ADMIN" ? undefined : actor.user.tenantId);
  },

  async createCustomRole(actor: ActorContext, data: CreateCustomRoleInput) {
    const { tenantId } = actor.user;
    assertCanGrant(actor, data.permissions);

    if (await roleModel.findByName(tenantId, data.name)) {
      throw new ConflictError(`A custom role named '${data.name}' already exists in your hotel`, ErrorCode.ROLE_EXISTS);
    }

    const role = await roleModel.create({
      tenantId,
      name: data.name,
      description: data.description || null,
      baseRole: data.baseRole,
      permissions: data.permissions,
    });

    await auditService.recordAction(actor, {
      action: "CUSTOM_ROLE_CREATED",
      resource: "custom_roles",
      resourceId: role.id,
      details: { name: role.name, permissionsCount: role.permissions.length },
    });

    return role;
  },

  async updateCustomRole(actor: ActorContext, id: string, data: UpdateCustomRoleInput) {
    const existing = await getOwnedRole(actor, id);
    assertCanGrant(actor, data.permissions);

    const updated = await roleModel.update(id, {
      ...(data.name ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.baseRole ? { baseRole: data.baseRole } : {}),
      ...(data.permissions ? { permissions: data.permissions } : {}),
    });

    await auditService.recordAction(actor, {
      tenantId: existing.tenantId,
      action: "CUSTOM_ROLE_UPDATED",
      resource: "custom_roles",
      resourceId: id,
      details: data,
    });

    return updated;
  },

  async deleteCustomRole(actor: ActorContext, id: string): Promise<void> {
    const existing = await getOwnedRole(actor, id);

    await roleModel.delete(id);

    await auditService.recordAction(actor, {
      tenantId: existing.tenantId,
      action: "CUSTOM_ROLE_DELETED",
      resource: "custom_roles",
      resourceId: id,
      details: { name: existing.name },
    });
  },
};
