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

  async updateUserRole(id: string, role: Role): Promise<ApiResponse<User>> {
    await delay(150);
    const user = this.users.find((u) => u.id === id);
    if (!user) {
      return {
        success: false,
        data: null as unknown as User,
        error: { code: "USER_NOT_FOUND", message: "User not found" },
      };
    }
    user.role = role;
    user.updatedAt = new Date().toISOString();
    return { success: true, data: user, message: "Role updated" };
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
