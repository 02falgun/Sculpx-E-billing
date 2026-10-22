import { z } from "zod";

export const generateBillParamSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format"),
});

export type GenerateBillParam = z.infer<typeof generateBillParamSchema>;

export const getBillParamSchema = z.object({
  id: z.string().uuid("Invalid bill ID format"),
});

export type GetBillParam = z.infer<typeof getBillParamSchema>;

export const getBillByOrderParamSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format"),
});

export type GetBillByOrderParam = z.infer<typeof getBillByOrderParamSchema>;

export const listBillsQuerySchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListBillsQuery = z.infer<typeof listBillsQuerySchema>;

export const applyDiscountBodySchema = z.object({
  type: z.enum(["PERCENTAGE", "FLAT"], {
    errorMap: () => ({ message: "Discount type must be PERCENTAGE or FLAT" }),
  }),
  value: z.number().positive("Discount value must be greater than 0"),
  code: z.string().optional(),
  reason: z.string().optional(),
});

export type ApplyDiscountBody = z.infer<typeof applyDiscountBodySchema>;

export const voidBillBodySchema = z.object({
  reason: z.string().min(5, "Void reason must be at least 5 characters"),
});

export type VoidBillBody = z.infer<typeof voidBillBodySchema>;

export const recordPaymentBodySchema = z.object({
  billId: z.string().uuid().optional(),
  amount: z.number().positive("Payment amount must be greater than 0"),
  method: z.enum(
    ["CASH", "UPI", "CARD", "ROOM_CHARGE", "ROOM_FOLIO", "NET_BANKING", "OTHER"],
    {
      errorMap: () => ({ message: "Invalid payment method" }),
    }
  ),
  transactionReference: z.string().optional(),
  cardLastFour: z.string().optional(),
  upiId: z.string().optional(),
  roomChargeDetails: z
    .object({
      roomNumber: z.string().optional(),
      guestName: z.string().optional(),
      roomFolioId: z.string().optional(),
    })
    .optional(),
  notes: z.string().optional(),
});

export type RecordPaymentBody = z.infer<typeof recordPaymentBodySchema>;
