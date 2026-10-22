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

/** Fields of an audit entry the caller supplies when recording an actor's action. */
export type AuditActionEntry = Pick<
  CreateAuditLogParams,
  "action" | "resource" | "resourceId" | "details" | "tenantId"
>;

export interface AuditLogFilter {
  tenantId?: string | null;
  action?: string;
  resource?: string;
}

export interface AuditListOptions {
  limit?: number;
  offset?: number;
  action?: string;
  resource?: string;
}

/** Raw query string for GET /audit-logs. */
export interface AuditListQuery {
  limit?: string;
  offset?: string;
  action?: string;
  resource?: string;
  tenantId?: string;
}
