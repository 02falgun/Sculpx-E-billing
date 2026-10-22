import { z } from "zod";

export const kotParamsSchema = z.object({
  id: z.string().uuid("Invalid KOT identifier format (must be UUID)"),
});

export const updateKotStatusBodySchema = z.object({
  status: z.string().min(1, "Status is required"),
  note: z.string().max(500, "Note must be 500 characters or less").optional(),
});

export const getKotsQuerySchema = z.object({
  station: z.string().optional(),
});

export type UpdateKotStatusInput = z.infer<typeof updateKotStatusBodySchema>;
export type GetKotsQuery = z.infer<typeof getKotsQuerySchema>;
