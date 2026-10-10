import { IAuthService } from "../interfaces";
import { ApiResponse, AuthSession, LoginCredentials, User } from "@/types";
import { apiClient } from "../client";

export class HttpAuthService implements IAuthService {
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthSession>> {
    return apiClient.post<AuthSession>("/auth/login", credentials);
  }

  async logout(): Promise<ApiResponse<void>> {
    return apiClient.post<void>("/auth/logout");
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return apiClient.get<User>("/auth/me");
  }
}
