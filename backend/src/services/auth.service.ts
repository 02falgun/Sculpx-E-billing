import { ForbiddenError, UnauthorizedError } from "../lib/errors.js";
import { ErrorCode } from "../constants/error-codes.js";
import { userModel } from "../models/user.model.js";
import { verifyPassword, normalizeEmail } from "../lib/password.js";
import type { AuthenticatedUser, JwtClaims } from "../types/auth.types.js";
import { ROLE_DEFAULT_PERMISSIONS } from "../config/permissions.js";
import type { LoginInput } from "../validations/auth.validation.js";

// Default: 8 hours shift duration
const SESSION_DURATION_SECONDS = 8 * 60 * 60;

export const authService = {
  async login(data: LoginInput, signToken: (claims: JwtClaims) => string) {
    const plainPassword = (data.password || data.pinOrPassword)!;
    const normalizedEmail = normalizeEmail(data.email);

    const user = await userModel.findByEmailWithPermissions(normalizedEmail);

    // Generic failure response to prevent email enumeration
    if (!user) {
      throw new UnauthorizedError("Invalid email or password", ErrorCode.INVALID_CREDENTIALS);
    }

    const isPasswordValid = await verifyPassword(plainPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password", ErrorCode.INVALID_CREDENTIALS);
    }

    if (!user.isActive) {
      throw new ForbiddenError("Account has been deactivated. Please contact your manager.", ErrorCode.ACCOUNT_DISABLED);
    }

    const expiresAt = new Date(Date.now() + SESSION_DURATION_SECONDS * 1000).toISOString();

    const token = signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tokenVersion: user.tokenVersion,
    });

    const explicitPerms = user.permissions.map((p) => p.permissionKey);
    const roleDefaults = ROLE_DEFAULT_PERMISSIONS[user.role] || [];
    const effectivePermissions = Array.from(new Set([...roleDefaults, ...explicitPerms]));

    return {
      user: {
        id: user.id,
        tenantId: user.tenantId,
        name: user.name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        isActive: user.isActive,
        permissions: effectivePermissions,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      token,
      expiresAt,
    };
  },

  // Matches both the direct User object and the nested { user } contracts
  getProfile(user: AuthenticatedUser) {
    const profile = {
      id: user.id,
      tenantId: user.tenantId,
      name: user.name,
      email: user.email,
      role: user.role,
      phoneNumber: user.phoneNumber,
      isActive: user.isActive,
      permissions: user.permissions,
    };
    return { ...profile, user: { ...profile } };
  },
};
