import { ID, Timestamped } from "./common";

export type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "CAPTAIN"
  | "WAITER"
  | "CASHIER"
  | "KITCHEN_STAFF";

export interface User extends Timestamped {
  id: ID;
  email: string;
  name: string;
  role: Role;
  avatarUrl?: string;
  phoneNumber?: string;
  isActive: boolean;
  permissions?: string[];
}

export interface AuthSession {
  user: User;
  token: string;
  refreshToken?: string;
  expiresAt: string;
}

export interface LoginCredentials {
  email: string;
  pinOrPassword: string;
}
