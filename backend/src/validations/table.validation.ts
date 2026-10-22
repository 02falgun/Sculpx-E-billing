import { z } from "zod";
import { TableStatus } from "@prisma/client";

export const tableIdParamSchema = z.object({
  id: z.string().min(1),
});

export const createTableSchema = z.object({
  tableNumber: z.string().min(1, "Table number is required").max(50),
  displayName: z.string().min(1, "Display name is required").max(100),
  capacity: z.coerce.number().min(1).max(50).default(4),
  section: z.string().default("Main Dining"),
});

export const updateTableSchema = z.object({
  tableNumber: z.string().min(1).max(50).optional(),
  displayName: z.string().min(1).max(100).optional(),
  capacity: z.coerce.number().min(1).max(50).optional(),
  section: z.string().optional(),
  status: z.nativeEnum(TableStatus).optional(),
  isActive: z.boolean().optional(),
});

export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
