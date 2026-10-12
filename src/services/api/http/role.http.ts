import { IRoleService } from "../interfaces";
import { ApiResponse, Role } from "@/types";
import { apiClient } from "../client";

export class HttpRoleService implements IRoleService {
  async getPermissionCatalog(): Promise<
    ApiResponse<{
      catalog: Array<{ key: string; name: string; category: string; description: string; isSensitive?: boolean }>;
      roleDefaults: Record<string, string[]>;
      roles: string[];
    }>
  > {
    return apiClient.get("/roles/catalog");
  }

  async getCustomRoles(): Promise<
    ApiResponse<Array<{ id: string; name: string; description?: string; baseRole: Role; permissions: string[] }>>
  > {
    return apiClient.get("/roles/custom");
  }

  async createCustomRole(data: {
    name: string;
    description?: string;
    baseRole: Role;
    permissions: string[];
  }): Promise<ApiResponse<unknown>> {
    return apiClient.post("/roles/custom", data);
  }

  async updateCustomRole(
    id: string,
    data: Partial<{
      name: string;
      description?: string;
      baseRole: Role;
      permissions: string[];
    }>
  ): Promise<ApiResponse<unknown>> {
    return apiClient.patch(`/roles/custom/${encodeURIComponent(id)}`, data);
  }

  async deleteCustomRole(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete(`/roles/custom/${encodeURIComponent(id)}`);
  }
}
