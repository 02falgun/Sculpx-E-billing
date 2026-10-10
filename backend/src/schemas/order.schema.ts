import { z } from "zod";
import { cartItemInputSchema } from "./cart.schema.js";

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

export interface CreatedOrderItemResponse {
  id: string;
  menuItemId: string | null;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxAmount: number;
  modifiers: Array<{ id: string; name: string; price: number; groupName: string }>;
  specialInstructions: string | null;
  status: string;
}

export interface CreatedKotResponse {
  id: string;
  kotNumber: string;
  status: string;
  station: string;
  itemCount: number;
  createdAt: string;
}

export interface CreateOrderResponse {
  id: string;
  orderNumber: string;
  status: string;
  source: string;
  paymentPreference: string;
  subtotal: number;
  taxTotal: number;
  serviceCharge: number;
  grandTotal: number;
  customerName: string | null;
  customerPhone: string | null;
  specialInstructions: string | null;
  diningContext: {
    type: "TABLE" | "ROOM";
    identifier: string;
    displayName: string;
    roomOrTableId: string;
  };
  items: CreatedOrderItemResponse[];
  assignedKotIds: string[];
  kots: CreatedKotResponse[];
  createdAt: string;
  updatedAt: string;
  // Aliases for frontend 1:1 compatibility with Order entity:
  order: {
    id: string;
    orderNumber: string;
    status: string;
    source: string;
    paymentPreference: string;
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
    items: CreatedOrderItemResponse[];
    createdAt: string;
  };
}
