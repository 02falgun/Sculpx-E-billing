import { IUserService, IAuthService } from "../interfaces";
import { ApiResponse, AuthSession, LoginCredentials, Role, User } from "@/types";
import { MOCK_USERS } from "@/mocks/mockDb";

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockUserService implements IUserService {
  private users: User[] = [...MOCK_USERS];

  async getUsers(): Promise<ApiResponse<User[]>> {
    await delay(100);
    return { success: true, data: this.users };
  }

  async createUser(user: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<ApiResponse<User>> {
    await delay(200);
    const newUser: User = {
      ...user,
      id: `usr-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    return { success: true, data: newUser, message: "User created" };
  }

  async updateUser(id: string, data: Partial<{ name: string; phoneNumber?: string | null; role: Role; isActive: boolean }>): Promise<ApiResponse<User>> {
    await delay(150);
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      return {
        success: false,
        data: null as unknown as User,
        error: { code: "USER_NOT_FOUND", message: "User not found" },
      };
    }
    if (data.name !== undefined) user.name = data.name;
    if (data.phoneNumber !== undefined) user.phoneNumber = data.phoneNumber || undefined;
    if (data.role !== undefined) user.role = data.role;
    if (data.isActive !== undefined) user.isActive = data.isActive;
    user.updatedAt = new Date().toISOString();
    return { success: true, data: user, message: "User updated" };
  }

  async updateUserRole(id: string, role: Role): Promise<ApiResponse<User>> {
    return this.updateUser(id, { role });
  }

  async updateUserPermissions(id: string, permissions: string[]): Promise<ApiResponse<{ id: string; permissions: string[] }>> {
    await delay(150);
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      return {
        success: false,
        data: null as unknown as { id: string; permissions: string[] },
        error: { code: "USER_NOT_FOUND", message: "User not found" },
      };
    }
    user.permissions = permissions;
    return { success: true, data: { id, permissions }, message: "Permissions updated" };
  }

  async resetPassword(id: string): Promise<ApiResponse<null>> {
    await delay(150);
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      return { success: false, data: null, error: { code: "USER_NOT_FOUND", message: "User not found" } };
    }
    return { success: true, data: null, message: "Password reset successfully" };
  }

  async revokeSessions(id: string): Promise<ApiResponse<null>> {
    await delay(150);
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      return { success: false, data: null, error: { code: "USER_NOT_FOUND", message: "User not found" } };
    }
    return { success: true, data: null, message: "All sessions revoked" };
  }

  async deactivateUser(id: string): Promise<ApiResponse<null>> {
    await delay(150);
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      return { success: false, data: null, error: { code: "USER_NOT_FOUND", message: "User not found" } };
    }
    user.isActive = false;
    return { success: true, data: null, message: "User deactivated" };
  }
}

export class MockAuthService implements IAuthService {
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthSession>> {
    await delay(250);
    const user = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === credentials.email.toLowerCase(),
    );

    if (!user) {
      return {
        success: false,
        data: null as unknown as AuthSession,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or PIN. Try admin@grandpalace.com, waiter@grandpalace.com, or cashier@grandpalace.com",
        },
      };
    }

    const session: AuthSession = {
      user,
      token: `mock-jwt-token-${user.id}-${Date.now()}`,
      expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    };

    return { success: true, data: session, message: `Welcome back, ${user.name}` };
  }

  async logout(): Promise<ApiResponse<void>> {
    await delay(100);
    return { success: true, data: undefined, message: "Logged out" };
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    await delay(100);
    return { success: true, data: MOCK_USERS[0] };
  }
}
