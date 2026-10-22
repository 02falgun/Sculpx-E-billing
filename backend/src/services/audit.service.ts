import type { Prisma } from "@prisma/client";
import { auditModel } from "../models/audit.model.js";
import { logger } from "../lib/logger.js";
import type { ActorContext } from "../types/auth.types.js";
import type {
  AuditActionEntry,
  AuditListOptions,
  AuditListQuery,
  CreateAuditLogParams,
} from "../types/audit.types.js";

const SENSITIVE_KEY_FRAGMENTS = ["password", "secret", "token", "hash", "apikey"];

function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class AuditService {
  /**
   * Asynchronously records an audit event without blocking the primary business flow.
   * Sanitizes sensitive fields to prevent credential leakage.
   */
  async record(params: CreateAuditLogParams): Promise<void> {
    try {
      const sanitizedDetails = this.sanitizeDetails(params.details);

      await auditModel.create({
        tenantId: params.tenantId || null,
        actorId: params.actorId || null,
        actorEmail: params.actorEmail || null,
        actorRole: params.actorRole || null,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId || null,
        // Details come from JSON-serialisable request/entity data
        details: sanitizedDetails as Prisma.InputJsonObject,
        ipAddress: params.ipAddress || null,
      });
    } catch (err) {
      logger.error({ err, action: params.action }, "Failed to write audit log entry");
    }
  }

  /**
   * Record an action performed by an authenticated actor. Fills actorId, actorEmail,
   * actorRole and ipAddress from the actor; tenantId defaults to the actor's tenant.
   */
  async recordAction(
    actor: ActorContext,
    entry: AuditActionEntry
  ): Promise<void> {
    return this.record({
      tenantId: entry.tenantId === undefined ? actor.user.tenantId : entry.tenantId,
      actorId: actor.user.id,
      actorEmail: actor.user.email,
      actorRole: actor.user.role,
      ipAddress: actor.ipAddress,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      details: entry.details,
    });
  }

  /**
   * Alias for record()
   */
  async log(params: CreateAuditLogParams): Promise<void> {
    return this.record(params);
  }

  /**
   * Queries audit logs with pagination and tenant filtering.
   */
  async listLogs(
    tenantId: string | null,
    options: AuditListOptions = {}
  ) {
    const limit = Math.min(Math.max(options.limit || 50, 1), 200);
    const offset = Math.max(options.offset || 0, 0);

    const { logs, total } = await auditModel.findPage(
      { tenantId, action: options.action, resource: options.resource },
      limit,
      offset
    );

    return { logs, total, limit, offset };
  }

  /**
   * Lists audit logs scoped to the actor: Super Admins see all tenants (or one via tenantId).
   */
  async listLogsForActor(actor: ActorContext, query: AuditListQuery) {
    const { user } = actor;
    const targetTenantId =
      user.role === "SUPER_ADMIN" ? query.tenantId || null : user.tenantId;

    return this.listLogs(targetTenantId, {
      limit: query.limit ? parseInt(query.limit, 10) : 50,
      offset: query.offset ? parseInt(query.offset, 10) : 0,
      action: query.action,
      resource: query.resource,
    });
  }

  private sanitizeDetails(details?: Record<string, unknown> | null): Record<string, unknown> {
    if (!details || typeof details !== "object") return {};
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(details)) {
      if (isSensitiveKey(key)) {
        sanitized[key] = "[REDACTED]";
      } else if (isPlainObject(value)) {
        sanitized[key] = this.sanitizeDetails(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

export const auditService = new AuditService();
