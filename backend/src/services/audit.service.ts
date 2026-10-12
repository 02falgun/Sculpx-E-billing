import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

export interface CreateAuditLogParams {
  tenantId?: string | null;
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
}

export class AuditService {
  /**
   * Asynchronously records an audit event without blocking the primary business flow.
   * Sanitizes sensitive fields to prevent credential leakage.
   */
  async record(params: CreateAuditLogParams): Promise<void> {
    try {
      const sanitizedDetails = this.sanitizeDetails(params.details);

      await prisma.auditLog.create({
        data: {
          tenantId: params.tenantId || null,
          actorId: params.actorId || null,
          actorEmail: params.actorEmail || null,
          actorRole: params.actorRole || null,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId || null,
          details: (sanitizedDetails as any) || {},
          ipAddress: params.ipAddress || null,
        },
      });
    } catch (err) {
      logger.error({ err, action: params.action }, "Failed to write audit log entry");
    }
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
    options: { limit?: number; offset?: number; action?: string; resource?: string } = {}
  ) {
    const limit = Math.min(Math.max(options.limit || 50, 1), 200);
    const offset = Math.max(options.offset || 0, 0);

    const where: Record<string, unknown> = {};
    if (tenantId) {
      where.tenantId = tenantId;
    }
    if (options.action) {
      where.action = options.action;
    }
    if (options.resource) {
      where.resource = options.resource;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { logs, total, limit, offset };
  }

  private sanitizeDetails(details?: Record<string, unknown> | null): Record<string, unknown> {
    if (!details || typeof details !== "object") return {};
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(details)) {
      const lower = key.toLowerCase();
      if (
        lower.includes("password") ||
        lower.includes("secret") ||
        lower.includes("token") ||
        lower.includes("hash") ||
        lower.includes("apikey")
      ) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeDetails(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}

export const auditService = new AuditService();
