import { IAuditService } from "../interfaces";
import { ApiResponse } from "@/types";

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockAuditService implements IAuditService {
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
    await delay(100);
    return {
      success: true,
      data: {
        logs: [
          {
            id: "audit-1",
            actorEmail: "admin@hotel.com",
            actorRole: "ADMIN",
            action: "PROPERTY_SETTINGS_UPDATED",
            resource: "TENANT",
            details: { name: "Sculpx Grand Hotel & Restaurant" },
            ipAddress: "127.0.0.1",
            createdAt: new Date().toISOString(),
          },
          {
            id: "audit-2",
            actorEmail: "admin@hotel.com",
            actorRole: "ADMIN",
            action: "TABLE_CREATED",
            resource: "TABLE",
            resourceId: "T-01",
            details: { tableNumber: "T-01", capacity: 4 },
            ipAddress: "127.0.0.1",
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
        ],
        total: 2,
      },
    };
  }
}
