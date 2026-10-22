import { IAuditService } from "../interfaces";
import { ApiResponse } from "@/types";
import { apiClient } from "../client";

export class HttpAuditService implements IAuditService {
  async getAuditLogs(query?: { limit?: number; offset?: number; action?: string; resource?: string }): Promise<
    ApiResponse<{
      logs: Array<{
        id: string;
        actorEmail?: string;
        actorRole?: string;
        action: string;
        resource: string;
        resourceId?: string;
        details?: Record<string, unknown>;
        ipAddress?: string;
        createdAt: string;
      }>;
      total: number;
    }>
  > {
    const params = new URLSearchParams();
    if (query?.limit) params.set("limit", String(query.limit));
    if (query?.offset) params.set("offset", String(query.offset));
    if (query?.action) params.set("action", query.action);
    if (query?.resource) params.set("resource", query.resource);
    const qs = params.toString();
    return apiClient.get(`/audit${qs ? `?${qs}` : ""}`);
  }
}
