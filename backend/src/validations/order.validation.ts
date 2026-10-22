import { z } from "zod";
import { OrderStatus } from "@prisma/client";
import { cartItemInputSchema } from "./cart.validation.js";

/**
 * Zod validation schema for POST /api/v1/orders request body.
 */
export const createOrderRequestSchema = z.object({
  qrToken: z
    .string({ required_error: "qrToken is required" })
    .trim()
    .min(3, "qrToken must be at least 3 characters")
    .max(100, "qrToken cannot exceed 100 characters")
    .regex(/^[a-zA-Z0-9_\-\.]+$/, "qrToken contains invalid characters"),
  items: z
    .array(cartItemInputSchema, { required_error: "items array is required" })
    .min(1, "Order items cannot be empty")
    .max(50, "Order cannot exceed 50 distinct items"),
  customerName: z
    .string()
    .trim()
    .max(255, "customerName cannot exceed 255 characters")
    .optional(),
  customerPhone: z
    .string()
    .trim()
    .max(30, "customerPhone cannot exceed 30 characters")
    .optional(),
  specialInstructions: z
    .string()
    .trim()
    .max(500, "specialInstructions cannot exceed 500 characters")
    .optional(),
  paymentPreference: z
    .enum(["PAY_NOW", "PAY_LATER"])
    .default("PAY_LATER"),
  source: z
    .enum(["CUSTOMER_QR", "STAFF_POS"])
    .optional(),
});

export type CreateOrderRequest = z.infer<typeof createOrderRequestSchema>;

/**
 * Request headers schema supporting Idempotency-Key.
 */
export const orderHeadersSchema = z
  .object({
    "idempotency-key": z
      .string()
      .trim()
      .min(1, "Idempotency-Key cannot be empty")
      .max(255, "Idempotency-Key cannot exceed 255 characters")
      .optional(),
  })
  .passthrough();

export const getOrderParamsSchema = z.object({
  id: z.string().min(1, "Order ID is required"),
});

export const listOrdersQuerySchema = z.object({
  status: z.string().optional(),
  qrType: z.enum(["ROOM", "TABLE"]).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;

export const updateStatusBodySchema = z.object({
  status: z.nativeEnum(OrderStatus),
  note: z.string().max(500).optional(),
});

export type UpdateStatusBody = z.infer<typeof updateStatusBodySchema>;

export const cancelOrderBodySchema = z.object({
  reason: z.string().trim().min(1, "Cancellation reason is required").max(500),
});

export type CancelOrderBody = z.infer<typeof cancelOrderBodySchema>;
