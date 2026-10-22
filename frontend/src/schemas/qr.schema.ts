import { z } from "zod";

export const qrTokenSchema = z.string().min(3, "Invalid QR token format").max(100);

export const qrContextTypeSchema = z.enum(["ROOM", "TABLE"]);

export const qrContextSchema = z.object({
  token: qrTokenSchema,
  type: qrContextTypeSchema,
  identifier: z.string().min(1, "Identifier is required"),
  displayName: z.string().min(1, "Display name is required"),
  hotelId: z.string().min(1),
  hotelName: z.string().min(1),
  locationDetails: z
    .object({
      floor: z.string().optional(),
      section: z.string().optional(),
      capacity: z.number().optional(),
    })
    .optional(),
  isActive: z.boolean(),
  activeOrderId: z.string().optional(),
  activeBillId: z.string().optional(),
});
