import { ID, Timestamped } from "./common";
import { QRContext } from "./qr";
import { Payment } from "./payment";

export type BillStatus = "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "VOIDED";

export interface TaxBreakdown {
  name: string; // e.g., "CGST (2.5%)", "SGST (2.5%)", "Service Charge (5%)"
  ratePercentage: number;
  amount: number;
}

export interface DiscountInfo {
  code?: string;
  type: "PERCENTAGE" | "FLAT";
  value: number;
  amount: number;
  authorizedBy?: string;
}

export interface BillItem {
  id: ID;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Bill extends Timestamped {
  id: ID;
  billNumber: string; // e.g. "INV-2026-089"
  orderId: ID;
  orderNumber: string;
  qrContext: QRContext;
  status: BillStatus;
  items: BillItem[];
  subtotal: number;
  discounts: DiscountInfo[];
  totalDiscount: number;
  taxes: TaxBreakdown[];
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  payments: Payment[];
  customerGstNumber?: string;
  settledAt?: string;
  voidedReason?: string;
}
