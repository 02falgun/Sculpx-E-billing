import { z } from "zod";

/**
 * QR token validation schema.
 * Rejects empty, too short (< 3), too long (> 100), or malformed tokens.
 */
export const qrTokenParamSchema = z.object({
  token: z
    .string({ required_error: "QR token is required" })
    .trim()
    .min(3, "QR token must be at least 3 characters")
    .max(100, "QR token cannot exceed 100 characters")
    .regex(/^[a-zA-Z0-9_\-\.]+$/, "QR token contains invalid characters"),
});

export type QrTokenParam = z.infer<typeof qrTokenParamSchema>;

export type QrTypeDto = "TABLE" | "ROOM";

export interface PublicQrLocationDetails {
  floor?: string;
  section?: string;
  capacity?: number;
}

export interface PublicQrContextResponse {
  id: string;
  token: string;
  type: QrTypeDto;
  identifier: string;
  displayName: string;
  roomOrTableId: string;
  tableId?: string;
  roomId?: string;
  locationDetails: PublicQrLocationDetails;
  subtext: string;
  isActive: boolean;
  status: string;
}
