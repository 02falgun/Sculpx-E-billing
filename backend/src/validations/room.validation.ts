import { z } from "zod";
import { RoomStatus } from "@prisma/client";

export const createRoomSchema = z.object({
  roomNumber: z.string().min(1, "Room number is required").max(50),
  floor: z.string().min(1, "Floor is required").max(50),
  roomType: z.string().default("STANDARD"),
  capacity: z.coerce.number().min(1).max(20).default(2),
});

export const updateRoomSchema = z.object({
  roomNumber: z.string().min(1).max(50).optional(),
  floor: z.string().min(1).max(50).optional(),
  roomType: z.string().optional(),
  capacity: z.coerce.number().min(1).max(20).optional(),
  status: z.nativeEnum(RoomStatus).optional(),
  guestName: z.string().optional().nullable(),
  folioId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
