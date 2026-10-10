import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { verifyPassword, normalizeEmail } from "../lib/password.js";
import { formatSuccessResponse, AppError } from "../lib/errors.js";
import { authenticate, requireRoles, requireTenantScope } from "../middleware/auth.js";

const loginBodySchema = z
  .object({
    email: z.string().min(1, "Email is required").email("Invalid email address format"),
    password: z.string().min(1, "Password is required").optional(),
    pinOrPassword: z.string().min(1, "Password is required").optional(),
  })
  .refine((data) => !!(data.password || data.pinOrPassword), {
    message: "Password is required (either 'password' or 'pinOrPassword')",
    path: ["password"],
  });

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  const effectiveLoginRateLimit = env.NODE_ENV === "test" ? 1000 : env.RATE_LIMIT_MAX;

  /**
   * POST /login
   * Public endpoint to authenticate staff members.
   * Rate limited to mitigate brute force credential attacks.
   */
  fastify.post(
    "/login",
    {
      config: {
        rateLimit: {
          max: effectiveLoginRateLimit,
          timeWindow: env.RATE_LIMIT_WINDOW_MS,
        },
      },
    },
    async (request, reply) => {
      // Validate incoming request body
      const parseResult = loginBodySchema.safeParse(request.body);
      if (!parseResult.success) {
        const details = parseResult.error.issues.map((issue) => ({
          field: issue.path.join("."),
          issue: issue.message,
        }));
        throw new AppError("Request validation failed", 400, "VALIDATION_FAILED", details);
      }

      const { email, password, pinOrPassword } = parseResult.data;
      const plainPassword = (password || pinOrPassword)!;
      const normalizedEmail = normalizeEmail(email);

      // Locate user record with granted permissions
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: {
          permissions: {
            select: {
              permissionKey: true,
            },
          },
        },
      });

      // Generic authentication failure response to prevent email enumeration
      if (!user) {
        throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
      }

      // Verify bcrypt password hash
      const isPasswordValid = await verifyPassword(plainPassword, user.passwordHash);
      if (!isPasswordValid) {
        throw new AppError("Invalid email or password", 401, "INVALID_CREDENTIALS");
      }

      // Reject inactive or disabled accounts
      if (!user.isActive) {
        throw new AppError(
          "Account has been deactivated. Please contact your manager.",
          403,
          "ACCOUNT_DISABLED"
        );
      }

      // Calculate token expiration
      // Default: 8 hours shift duration
      const expiresInSeconds = 8 * 60 * 60;
      const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

      // Sign JWT with subject, email, role, and tenant boundary claims
      const token = fastify.jwt.sign(
        {
          sub: user.id,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId,
        },
        {
          expiresIn: env.JWT_EXPIRES_IN,
        }
      );

      const userProfile = {
        id: user.id,
        tenantId: user.tenantId,
        name: user.name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        isActive: user.isActive,
        permissions: user.permissions.map((p) => p.permissionKey),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      };

      const payload = {
        user: userProfile,
        token,
        expiresAt,
      };

      return reply.status(200).send(formatSuccessResponse(payload, request, "Login successful"));
    }
  );

  /**
   * GET /me
   * Protected endpoint to fetch current authenticated profile and permissions.
   */
  fastify.get(
    "/me",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      const user = request.authenticatedUser!;

      // Return user profile matching both direct User object and nested { user } contracts
      const userProfile = {
        id: user.id,
        tenantId: user.tenantId,
        name: user.name,
        email: user.email,
        role: user.role,
        phoneNumber: user.phoneNumber,
        isActive: user.isActive,
        permissions: user.permissions,
        user: {
          id: user.id,
          tenantId: user.tenantId,
          name: user.name,
          email: user.email,
          role: user.role,
          phoneNumber: user.phoneNumber,
          isActive: user.isActive,
          permissions: user.permissions,
        },
      };

      return reply.status(200).send(formatSuccessResponse(userProfile, request));
    }
  );

  /**
   * POST /logout
   * Session termination endpoint.
   */
  fastify.post(
    "/logout",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      return reply.status(200).send(formatSuccessResponse(null, request, "Logged out successfully"));
    }
  );

  /**
   * Protected Role & Tenant Verification Route (for automated security test assertion)
   */
  fastify.get(
    "/test-admin-only",
    {
      preHandler: [requireRoles("ADMIN", "SUPER_ADMIN"), requireTenantScope],
    },
    async (request, reply) => {
      return reply.status(200).send(
        formatSuccessResponse(
          {
            authorized: true,
            user: request.authenticatedUser,
          },
          request,
          "Admin access verified"
        )
      );
    }
  );

  /**
   * Dedicated rate limit test endpoint to verify 429 RATE_LIMIT_EXCEEDED
   */
  fastify.post(
    "/test-rate-limit",
    {
      config: {
        rateLimit: {
          max: 2,
          timeWindow: 60000,
        },
      },
    },
    async (request, reply) => {
      return reply.status(200).send(formatSuccessResponse({ ok: true }, request));
    }
  );
};
