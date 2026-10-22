import type { OrderSource, OrderStatus, PaymentPreference, Prisma } from "@prisma/client";
import type { orderDetailsInclude } from "../models/order.model.js";

/** Daily counters backing human-readable ORD-/KOT-/INV- numbers. */
export type CounterType = "ORDER" | "KOT" | "INVOICE";

export interface OrderListFilter {
  tenantId: string;
  status?: string;
  qrType?: "ROOM" | "TABLE";
}

export interface ListOrdersParams {
  status?: string;
  qrType?: "ROOM" | "TABLE";
  page?: number;
  limit?: number;
}

export interface CreateOrderOptions {
  idempotencyKey?: string;
  userRole?: string;
}

/** Order with QR code, table, room, items, KOTs and bill refs. */
export type OrderWithDetails = Prisma.OrderGetPayload<{ include: typeof orderDetailsInclude }>;

// ---------------------------------------------------------------------------
// Cart validation
// ---------------------------------------------------------------------------

// A type alias (not an interface) so it is assignable to Prisma's JSON input type.
export type ValidatedModifierSelection = {
  id: string;
  name: string;
  price: number;
  groupName: string;
};

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

// ---------------------------------------------------------------------------
// Order creation response
// ---------------------------------------------------------------------------

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
  qrContext?: OrderQrContext;
  timeline?: OrderTimelineEntry[];
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

// ---------------------------------------------------------------------------
// Order read response
// ---------------------------------------------------------------------------

export interface OrderQrContext {
  token: string;
  type: "TABLE" | "ROOM";
  identifier: string;
  displayName: string;
  tenantId: string;
}

export interface OrderTimelineEntry {
  status: string;
  timestamp: string;
  note?: string;
}

export interface OrderItemResponse {
  id: string;
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRatePercentage: number;
  taxAmount: number;
  modifiers: Prisma.JsonValue;
  specialInstructions?: string;
  status: string;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  source: OrderSource;
  paymentPreference: PaymentPreference;
  customerName?: string;
  customerPhone?: string;
  specialInstructions?: string;
  subtotal: number;
  taxTotal: number;
  serviceCharge: number;
  discountTotal: number;
  grandTotal: number;
  billId?: string;
  qrContext: OrderQrContext;
  items: OrderItemResponse[];
  timeline: OrderTimelineEntry[];
  cancellation?: {
    reason: string;
    cancelledAt: string;
    cancelledBy: "STAFF";
  };
  createdAt: string;
  updatedAt: string;
}

export interface OrderListResponse {
  items: OrderResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
