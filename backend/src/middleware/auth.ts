import type { FastifyReply, FastifyRequest } from "fastify";
import type { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: Role;
  phoneNumber?: string | null;
  isActive: boolean;
  permissions: string[];
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      sub: string;
      email: string;
      role: Role;
      tenantId: string;
    };
    user: {
      sub: string;
      email: string;
      role: Role;
      tenantId: string;
    };
  }
}

declare module "fastify" {
  interface FastifyRequest {
    authenticatedUser?: AuthenticatedUser;
  }
}

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
    throw new AppError(message, 401, "UNAUTHORIZED");
  }

  const userId = request.user?.sub;
  if (!userId) {
    throw new AppError("Malformed token payload: missing subject identifier", 401, "UNAUTHORIZED");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      permissions: {
        select: {
          permissionKey: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError("User account not found or session revoked", 401, "UNAUTHORIZED");
  }

  if (!user.isActive) {
    throw new AppError(
      "Account has been deactivated. Please contact your manager.",
      403,
      "ACCOUNT_DISABLED"
    );
  }

  request.authenticatedUser = {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    role: user.role,
    phoneNumber: user.phoneNumber,
    isActive: user.isActive,
    permissions: user.permissions.map((p) => p.permissionKey),
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
      throw new AppError(
        `Access forbidden: role ${user.role} is not permitted to perform this action`,
        403,
        "FORBIDDEN",
        {
          requiredRoles: allowedRoles,
          currentRole: user.role,
        }
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
      throw new AppError(
        "Access forbidden: missing required permissions",
        403,
        "FORBIDDEN",
        { missingPermissions: missing }
      );
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

  const targetTenantId = params.tenantId || query.tenantId || body.tenantId;

  if (targetTenantId && targetTenantId !== user.tenantId) {
    throw new AppError(
      "Cross-tenant access forbidden: resource belongs to another organization",
      403,
      "FORBIDDEN"
    );
  }
}
