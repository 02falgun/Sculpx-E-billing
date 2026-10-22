import { z } from "zod";

export const recordPaymentSchema = z.object({
  billId: z.string().min(1, "Bill ID is required"),
  amount: z.number().positive("Amount must be greater than zero"),
  method: z.enum(["CASH", "CARD", "UPI", "ROOM_CHARGE", "NET_BANKING"]),
  transactionReference: z.string().optional(),
  roomChargeDetails: z
    .object({
      roomNumber: z.string().min(1, "Room number is required"),
      guestName: z.string().min(1, "Guest name is required"),
      roomFolioId: z.string().optional(),
    })
    .optional(),
  cardLastFour: z
    .string()
    .length(4, "Must be last 4 digits")
    .regex(/^[0-9]+$/, "Digits only")
    .optional(),
  upiId: z.string().optional(),
  notes: z.string().max(200).optional(),
});

export type RecordPaymentFormData = z.infer<typeof recordPaymentSchema>;
