import { z } from "zod";
import { Role } from "@prisma/client";

export const roleIdParamSchema = z.object({
  id: z.string().min(1),
});

export const createCustomRoleSchema = z.object({
  name: z.string().min(2, "Role name must be at least 2 characters").max(100),
  description: z.string().max(255).optional().nullable(),
  baseRole: z.nativeEnum(Role).default("WAITER"),
  permissions: z.array(z.string()).default([]),
});

export const updateCustomRoleSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(255).optional().nullable(),
  baseRole: z.nativeEnum(Role).optional(),
  permissions: z.array(z.string()).optional(),
});

export type CreateCustomRoleInput = z.infer<typeof createCustomRoleSchema>;
export type UpdateCustomRoleInput = z.infer<typeof updateCustomRoleSchema>;
