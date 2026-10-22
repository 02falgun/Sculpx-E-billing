import type { BillPaymentStatus, Prisma } from "@prisma/client";
import type { billDetailsInclude, billPaymentInclude } from "../models/bill.model.js";

/** Bill with items, payments and order (table, room, QR code). */
export type BillWithDetails = Prisma.BillGetPayload<{ include: typeof billDetailsInclude }>;

/** Bill with payments and order (table, room) — the shape locked for payment recording. */
export type BillForPayment = Prisma.BillGetPayload<{ include: typeof billPaymentInclude }>;

/** Tenant tax configuration used when issuing an invoice. */
export interface TenantBillingSettings {
  cgstRate?: Prisma.Decimal | number | string | null;
  sgstRate?: Prisma.Decimal | number | string | null;
  serviceChargeRate?: Prisma.Decimal | number | string | null;
  gstin?: string | null;
}

// The `taxDetails` JSON column. Declared as type aliases (not interfaces) so they
// stay assignable to Prisma's JSON input type.
export type BillTaxLine = {
  name: string;
  ratePercentage: number;
  amount: number;
};

export type BillDiscountEntry = {
  type: "PERCENTAGE" | "FLAT";
  value: number;
  amount: number;
  code?: string;
  reason?: string;
  authorizedBy?: string;
};

export type BillTaxDetails = {
  taxes?: BillTaxLine[];
  discounts?: BillDiscountEntry[];
  totalTax?: number;
  voidedReason?: string;
  settledAt?: string;
  [key: string]: Prisma.InputJsonValue | null | undefined;
};

export type BillStatusLabel = "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "VOIDED";

export interface FormattedBillResponse {
  id: string;
  billNumber: string;
  orderId: string;
  orderNumber: string;
  qrContext: {
    type: "TABLE" | "ROOM";
    identifier: string;
    displayName: string;
    token: string;
  };
  status: BillStatusLabel;
  paymentStatus: BillPaymentStatus;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  discounts: Array<{
    code?: string;
    type: "PERCENTAGE" | "FLAT";
    value: number;
    amount: number;
    authorizedBy?: string;
  }>;
  totalDiscount: number;
  taxes: BillTaxLine[];
  totalTax: number;
  serviceCharge: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  payments: Array<{
    id: string;
    billId: string;
    orderId: string;
    amount: number;
    method: string;
    status: string;
    transactionReference?: string | null;
    notes?: string | null;
    createdAt: string;
  }>;
  voidedReason?: string;
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BillListParams {
  tenantId: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface BillListResponse {
  data: FormattedBillResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RecordPaymentOptions {
  userId?: string;
  idempotencyKey?: string;
}

/** Response of POST /bills/:id/payments (also the cached idempotent replay body). */
export interface PaymentRecordedResponse {
  id: string;
  billId: string;
  orderId: string;
  amount: number;
  method: string;
  status: "SUCCESS";
  transactionReference: string | null;
  paidAmount: number;
  dueAmount: number;
  billStatus: "PAID" | "PARTIALLY_PAID";
  createdAt: string;
}
