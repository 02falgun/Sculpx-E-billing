import { IUserService } from "../interfaces";
import { ApiResponse, Role, User } from "@/types";
import { apiClient } from "../client";

export class HttpUserService implements IUserService {
  async getUsers(): Promise<ApiResponse<User[]>> {
    return apiClient.get<User[]>("/users");
  }

  async createUser(user: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<ApiResponse<User>> {
    return apiClient.post<User>("/users", user);
  }

  async updateUserRole(id: string, role: Role): Promise<ApiResponse<User>> {
    return apiClient.patch<User>(`/users/${encodeURIComponent(id)}/role`, { role });
  }
}
