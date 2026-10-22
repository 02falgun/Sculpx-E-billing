import { ITenantService, TenantProfile, PilotReadiness } from "../interfaces";
import { ApiResponse, User } from "@/types";
import { apiClient } from "../client";

export class HttpTenantService implements ITenantService {
  async getCurrentTenant(): Promise<ApiResponse<TenantProfile>> {
    return apiClient.get<TenantProfile>("/tenants/current");
  }

  async updateCurrentTenant(data: Partial<TenantProfile>): Promise<ApiResponse<TenantProfile>> {
    return apiClient.patch<TenantProfile>("/tenants/current", data);
  }

  async getReadiness(): Promise<ApiResponse<PilotReadiness>> {
    return apiClient.get<PilotReadiness>("/tenants/readiness");
  }

  async onboardHotel(data: Record<string, unknown>): Promise<ApiResponse<{ tenant: TenantProfile; adminUser: User }>> {
    return apiClient.post<{ tenant: TenantProfile; adminUser: User }>("/tenants", data);
  }
}
