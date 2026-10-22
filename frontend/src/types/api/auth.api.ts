/**
 * SCULPX E-Billing — Authentication & User API Contracts
 */

import { User, Role, AuthSession } from "../auth";
import { ApiPaginationQueryParams } from "./common.api";

export interface LoginRequestBody {
  email: string;
  pinOrPassword: string;
}

export interface LoginResponseBody {
  user: User;
  token: string;
  refreshToken?: string;
  expiresAt: string; // ISO 8601 UTC
}

export interface RefreshTokenRequestBody {
  refreshToken: string;
}

export interface CurrentUserResponseBody {
  user: User;
}

export interface UserListQueryParams extends ApiPaginationQueryParams {
  role?: Role;
  isActive?: boolean;
  search?: string;
}

export interface CreateUserRequestBody {
  name: string;
  email: string;
  role: Role;
  phoneNumber?: string;
  pinOrPassword?: string;
  isActive?: boolean;
}

export interface UpdateUserRequestBody {
  name?: string;
  email?: string;
  phoneNumber?: string;
  isActive?: boolean;
}

export interface UpdateUserRoleRequestBody {
  role: Role;
}
