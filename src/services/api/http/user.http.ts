import { IUserService } from "../interfaces";
import { ApiResponse, Role, User } from "@/types";
import { apiClient } from "../client";

export class HttpUserService implements IUserService {
  async getUsers(): Promise<ApiResponse<User[]>> {
    return apiClient.get<User[]>("/users");
  }

  async createUser(user: Omit<User, "id" | "createdAt" | "updatedAt"> & { password?: string }): Promise<ApiResponse<User>> {
    return apiClient.post<User>("/users", user);
  }

  async updateUser(id: string, data: Partial<{ name: string; phoneNumber?: string | null; role: Role; isActive: boolean }>): Promise<ApiResponse<User>> {
    return apiClient.patch<User>(`/users/${encodeURIComponent(id)}`, data);
  }

  async updateUserRole(id: string, role: Role): Promise<ApiResponse<User>> {
    return apiClient.patch<User>(`/users/${encodeURIComponent(id)}/role`, { role });
  }

  async updateUserPermissions(id: string, permissions: string[]): Promise<ApiResponse<{ id: string; permissions: string[] }>> {
    return apiClient.put<{ id: string; permissions: string[] }>(`/users/${encodeURIComponent(id)}/permissions`, { permissions });
  }

  async resetPassword(id: string, newPassword: string): Promise<ApiResponse<null>> {
    return apiClient.post<null>(`/users/${encodeURIComponent(id)}/reset-password`, { newPassword });
  }

  async revokeSessions(id: string): Promise<ApiResponse<null>> {
    return apiClient.post<null>(`/users/${encodeURIComponent(id)}/revoke-sessions`);
  }

  async deactivateUser(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/users/${encodeURIComponent(id)}`);
  }
}
