import { z } from "zod";

/**
 * Single cart item input schema.
 */
export const cartItemInputSchema = z.object({
  menuItemId: z.string({ required_error: "menuItemId is required" }).uuid("Invalid menuItemId format"),
  quantity: z
    .number({ required_error: "quantity is required" })
    .int("quantity must be an integer")
    .min(1, "quantity must be at least 1")
    .max(99, "quantity cannot exceed 99"),
  modifierOptionIds: z.array(z.string().uuid("Invalid modifierOptionId format")).max(20).optional(),
  modifierIds: z.array(z.string().uuid("Invalid modifierId format")).max(20).optional(),
  clientPrice: z.number().nonnegative("clientPrice cannot be negative").optional(),
  specialInstructions: z.string().max(255, "specialInstructions cannot exceed 255 characters").optional(),
});

export type CartItemInput = z.infer<typeof cartItemInputSchema>;

/**
 * Pre-checkout cart validation request body schema.
 */
export const validateCartRequestSchema = z.object({
  qrToken: z
    .string({ required_error: "qrToken is required" })
    .trim()
    .min(3, "qrToken must be at least 3 characters")
    .max(100, "qrToken cannot exceed 100 characters")
    .regex(/^[a-zA-Z0-9_\-\.]+$/, "qrToken contains invalid characters"),
  items: z
    .array(cartItemInputSchema, { required_error: "items array is required" })
    .min(1, "Cart cannot be empty")
    .max(50, "Cart cannot exceed 50 distinct items"),
});

export type ValidateCartRequest = z.infer<typeof validateCartRequestSchema>;

export interface ValidatedModifierSelection {
  id: string;
  name: string;
  price: number;
  groupName: string;
}

export interface ValidatedLineItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitBasePrice: number;
  modifiersSubtotal: number;
  unitPrice: number;
  lineSubtotal: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  modifiers: ValidatedModifierSelection[];
  specialInstructions?: string;
}

export interface TaxBreakdown {
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  totalTax: number;
}

export interface CartPricingSummary {
  itemsSubtotal: number;
  modifiersSubtotal: number;
  taxableSubtotal: number;
  taxBreakdown: TaxBreakdown;
  grandTotal: number;
}

export interface ValidatedDiningContext {
  type: "TABLE" | "ROOM";
  identifier: string;
  displayName: string;
  roomOrTableId: string;
  status: string;
}

export interface CartValidationResponse {
  isValid: boolean;
  context: ValidatedDiningContext;
  lineItems: ValidatedLineItem[];
  pricing: CartPricingSummary;
  // Aliases for 1:1 frontend contract compatibility:
  calculatedSubtotal: number;
  calculatedTax: number;
  calculatedGrandTotal: number;
  unavailableItems: Array<{ menuItemId: string; reason: string }>;
  priceDiscrepancies: Array<{ menuItemId: string; clientPrice: number; serverPrice: number }>;
  warnings: string[];
}
