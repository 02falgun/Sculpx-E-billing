import { z } from "zod";
import { Role } from "@prisma/client";
import { BadRequestError } from "../lib/errors.js";

export const createUserSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  name: z.string().min(1, "Name is required").max(255),
  role: z.nativeEnum(Role),
  phoneNumber: z.string().optional().nullable(),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  permissions: z.array(z.string()).optional(),
  tenantId: z.string().uuid().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  phoneNumber: z.string().optional().nullable(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

export const updatePermissionsSchema = z.object({
  permissions: z.array(z.string()),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdatePermissionsInput = z.infer<typeof updatePermissionsSchema>;

export function parseRoleBody(body: unknown): Role {
  const { role } = body as { role: Role };
  if (!role || !Object.values(Role).includes(role)) {
    throw new BadRequestError("Invalid role provided");
  }
  return role;
}
