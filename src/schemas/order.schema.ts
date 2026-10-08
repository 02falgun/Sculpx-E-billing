import { z } from "zod";

export const orderItemInputSchema = z.object({
  menuItemId: z.string().min(1, "Menu item ID is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  specialInstructions: z.string().max(200).optional(),
  modifierIds: z.array(z.string()).default([]),
});

export const createOrderSchema = z.object({
  qrToken: z.string().min(1, "QR token is required"),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  specialInstructions: z.string().optional(),
  paymentPreference: z.enum(["PAY_NOW", "PAY_LATER"]),
  items: z.array(orderItemInputSchema).min(1, "Cart cannot be empty"),
});

export const cancelOrderSchema = z.object({
  reason: z.string().min(3, "Cancellation reason must be at least 3 characters").max(200),
});
