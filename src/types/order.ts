import { ID, Timestamped } from "./common";
import { QRContext } from "./qr";

export type OrderStatus =
  | "PENDING_VALIDATION"
  | "PLACED"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentPreference = "PAY_NOW" | "PAY_LATER";

export type OrderSource = "CUSTOMER_QR" | "STAFF_POS";

export interface OrderItemModifier {
  modifierId: ID;
  name: string;
  price: number;
}

export interface OrderItem {
  id: ID;
  menuItemId: ID;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  taxRatePercentage: number;
  taxAmount: number;
  modifiers: OrderItemModifier[];
  specialInstructions?: string;
  status: "PLACED" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
}

export interface OrderTimelineEvent {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  actor?: string;
}

export interface CancellationInfo {
  reason: string;
  cancelledAt: string;
  cancelledBy: string; // "CUSTOMER" | "STAFF" | "SYSTEM"
  refundStatus?: "NOT_APPLICABLE" | "PENDING" | "PROCESSED";
}

export interface Order extends Timestamped {
  id: ID;
  orderNumber: string; // e.g. "ORD-2026-1001"
  qrContext: QRContext;
  status: OrderStatus;
  source: OrderSource;
  paymentPreference: PaymentPreference;
  customerName?: string;
  customerPhone?: string;
  specialInstructions?: string;
  items: OrderItem[];
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
  billId?: ID;
  timeline: OrderTimelineEvent[];
  cancellation?: CancellationInfo;
}

export interface CreateOrderPayload {
  qrToken: string;
  customerName?: string;
  customerPhone?: string;
  specialInstructions?: string;
  paymentPreference: PaymentPreference;
  items: {
    menuItemId: ID;
    quantity: number;
    specialInstructions?: string;
    modifierIds: ID[];
  }[];
}

export interface OrderValidationResult {
  isValid: boolean;
  unavailableItems: { menuItemId: ID; reason: string }[];
  priceDiscrepancies: { menuItemId: ID; clientPrice: number; serverPrice: number }[];
  calculatedSubtotal: number;
  calculatedTax: number;
  calculatedGrandTotal: number;
}
