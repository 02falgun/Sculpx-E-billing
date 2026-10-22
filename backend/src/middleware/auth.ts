import type { FastifyReply, FastifyRequest } from "fastify";
import type { Role } from "@prisma/client";
import { ForbiddenError, UnauthorizedError } from "../lib/errors.js";
import { ErrorCode } from "../constants/error-codes.js";
import { ROLE_DEFAULT_PERMISSIONS } from "../config/permissions.js";
import { userModel } from "../models/user.model.js";
import { locationModel } from "../models/location.model.js";

/**
 * Fastify preHandler hook to verify Bearer JWT and load active user from database.
 */
export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication required";
    throw new UnauthorizedError(message);
  }

  const userId = request.user?.sub;
  if (!userId) {
    throw new UnauthorizedError("Malformed token payload: missing subject identifier");
  }

  const user = await userModel.findByIdWithAuthContext(userId);

  if (!user) {
    throw new UnauthorizedError("User account not found or session revoked");
  }

  if (!user.isActive) {
    throw new ForbiddenError("Account has been deactivated. Please contact your manager.", ErrorCode.ACCOUNT_DISABLED);
  }

  // A tokenVersion older than the user's current one means the session was revoked
  const tokenVersion = request.user?.tokenVersion;
  if (tokenVersion !== undefined && tokenVersion < user.tokenVersion) {
    throw new UnauthorizedError("Session has been revoked. Please sign in again.", ErrorCode.SESSION_REVOKED);
  }

  const explicitPerms = user.permissions.map((p) => p.permissionKey);
  const roleDefaults = ROLE_DEFAULT_PERMISSIONS[user.role] || [];
  const effectivePermissions = Array.from(new Set([...roleDefaults, ...explicitPerms]));

  const assignedTenantIds = user.locationAssignments.map((a) => a.location.tenantId);
  const allAuthorizedTenantIds = Array.from(new Set([user.tenantId, ...assignedTenantIds]));
  const allAuthorizedLocationIds = user.locationAssignments.map((a) => a.locationId);
  const allAuthorizedOrgIds = user.organizationMemberships.map((m) => m.organizationId);

  request.authenticatedUser = {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    role: user.role,
    phoneNumber: user.phoneNumber,
    isActive: user.isActive,
    tokenVersion: user.tokenVersion,
    permissions: effectivePermissions,
    authorizedTenantIds: allAuthorizedTenantIds,
    authorizedLocationIds: allAuthorizedLocationIds,
    authorizedOrganizationIds: allAuthorizedOrgIds,
    organizationRole: user.organizationMemberships[0]?.role,
  };
}

/**
 * Fastify preHandler factory to enforce allowed roles.
 */
export function requireRoles(...allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.authenticatedUser) {
      await authenticate(request, reply);
    }

    const user = request.authenticatedUser!;

    // Super Admin has global system bypass
    if (user.role === "SUPER_ADMIN") {
      return;
    }

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError(
        `Access forbidden: role ${user.role} is not permitted to perform this action`,
        ErrorCode.FORBIDDEN,
        { requiredRoles: allowedRoles, currentRole: user.role }
      );
    }
  };
}

/**
 * Fastify preHandler factory to enforce explicit permission keys.
 */
export function requirePermissions(...requiredPermissions: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.authenticatedUser) {
      await authenticate(request, reply);
    }

    const user = request.authenticatedUser!;

    if (
      user.role === "SUPER_ADMIN" ||
      user.permissions.includes("all_admin") ||
      user.permissions.includes("all_superadmin")
    ) {
      return;
    }

    const missing = requiredPermissions.filter((p) => !user.permissions.includes(p));
    if (missing.length > 0) {
      throw new ForbiddenError("Access forbidden: missing required permissions", ErrorCode.FORBIDDEN, {
        missingPermissions: missing,
      });
    }
  };
}

/**
 * Fastify preHandler hook to enforce tenant boundary isolation.
 * Compares incoming resource tenantId (if present in params, query, or body)
 * against the authenticated user's tenantId.
 */
export async function requireTenantScope(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.authenticatedUser) {
    await authenticate(request, reply);
  }

  const user = request.authenticatedUser!;
  if (user.role === "SUPER_ADMIN") {
    return; // Super admins may inspect multi-tenant data
  }

  const params = (request.params as Record<string, string> | undefined) || {};
  const query = (request.query as Record<string, string> | undefined) || {};
  const body = (request.body as Record<string, string> | undefined) || {};

  const targetTenantId = params.tenantId || query.tenantId || body.tenantId || user.tenantId;

  if (!targetTenantId) {
    return;
  }

  if (!user.authorizedTenantIds.includes(targetTenantId)) {
    throw new ForbiddenError("Cross-tenant access forbidden: resource belongs to another organization");
  }

  // A suspended/archived location blocks every non-GET operational mutation
  if (request.method !== "GET") {
    const loc = await locationModel.findStatusByTenantId(targetTenantId);
    if (loc && loc.status !== "ACTIVE") {
      throw new ForbiddenError(
        `Location is ${loc.status.toLowerCase()}. Operational modifications are suspended.`,
        ErrorCode.LOCATION_SUSPENDED
      );
    }
  }
}
