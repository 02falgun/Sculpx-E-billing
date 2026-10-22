import { ForbiddenError, NotFoundError } from "./errors.js";
import { ErrorCode } from "../constants/error-codes.js";
import type { ActorContext } from "../types/auth.types.js";

/**
 * Return `value` if it exists, otherwise throw a 404.
 *
 *   const room = ensureFound(await roomModel.findById(id), "Room not found");
 */
export function ensureFound<T>(
  value: T | null | undefined,
  message: string,
  code: ErrorCode = ErrorCode.NOT_FOUND
): T {
  if (value === null || value === undefined) {
    throw new NotFoundError(message, code);
  }
  return value;
}

/**
 * Throw a 403 unless the actor is SUPER_ADMIN or belongs to `tenantId`.
 */
export function assertTenantAccess(
  actor: ActorContext,
  tenantId: string,
  message = "Forbidden: cross-tenant access denied"
): void {
  if (actor.user.role !== "SUPER_ADMIN" && actor.user.tenantId !== tenantId) {
    throw new ForbiddenError(message);
  }
}

/**
 * Throw a 403 unless the actor has the SUPER_ADMIN role.
 */
export function assertSuperAdmin(actor: ActorContext, message = "Forbidden"): void {
  if (actor.user.role !== "SUPER_ADMIN") {
    throw new ForbiddenError(message);
  }
}
