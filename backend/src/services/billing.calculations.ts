import { Prisma, BillPaymentStatus, PaymentMethod, PaymentRecordStatus } from "@prisma/client";
import type {
  BillStatusLabel,
  BillTaxDetails,
  BillWithDetails,
  FormattedBillResponse,
  TenantBillingSettings,
} from "../types/billing.types.js";

type Numeric = Prisma.Decimal | number | string;

/** The bill's `taxDetails` JSON as a plain object ({} when missing). */
export function parseTaxDetails(taxDetails: unknown): BillTaxDetails {
  return typeof taxDetails === "object" && taxDetails !== null
    ? (taxDetails as BillTaxDetails)
    : {};
}

/** Sum of SUCCESS payment amounts (plain number arithmetic). */
export function sumSuccessfulPayments(payments: Array<{ status: string; amount: Numeric }>): number {
  return payments
    .filter((p) => p.status === PaymentRecordStatus.SUCCESS)
    .reduce((sum, p) => sum + Number(p.amount), 0);
}

/** Outbox/response label for a bill after a payment. */
export function settlementLabel(status: BillPaymentStatus): "PAID" | "PARTIALLY_PAID" {
  return status === "PAID" ? "PAID" : "PARTIALLY_PAID";
}

/** Map a `?status=` list filter to the stored payment status. */
export function parseBillStatusFilter(status?: string): BillPaymentStatus | undefined {
  if (!status) return undefined;
  const upper = status.toUpperCase();
  if (upper === "ISSUED" || upper === "UNPAID") return BillPaymentStatus.UNPAID;
  if (upper === "PARTIALLY_PAID") return BillPaymentStatus.PARTIALLY_PAID;
  if (upper === "PAID") return BillPaymentStatus.PAID;
  if (upper === "VOIDED") return BillPaymentStatus.VOIDED;
  return undefined;
}

export function toPaymentMethod(method: string): PaymentMethod {
  if (method === "ROOM_CHARGE" || method === "ROOM_FOLIO") return PaymentMethod.ROOM_FOLIO;
  if (method === "CASH") return PaymentMethod.CASH;
  if (method === "CARD") return PaymentMethod.CARD;
  if (method === "UPI") return PaymentMethod.UPI;
  return PaymentMethod.OTHER;
}

function rateOrDefault(rate: Numeric | null | undefined, fallback: number): number {
  return rate !== undefined && rate !== null ? Number(rate) : fallback;
}

/**
 * Invoice totals for a new bill: tenant CGST/SGST (default 2.5%) and service charge
 * (default 0%) on the subtotal, grand total rounded to the nearest rupee.
 */
export function calculateInvoice(
  orderItems: Array<{ totalPrice: Prisma.Decimal }>,
  tenant: TenantBillingSettings | null
) {
  let subtotal = new Prisma.Decimal(0);
  for (const it of orderItems) {
    subtotal = subtotal.add(it.totalPrice);
  }

  const cgstRate = rateOrDefault(tenant?.cgstRate, 2.5);
  const sgstRate = rateOrDefault(tenant?.sgstRate, 2.5);
  const serviceChargeRate = rateOrDefault(tenant?.serviceChargeRate, 0.0);

  const serviceCharge = new Prisma.Decimal(
    (Number(subtotal) * (serviceChargeRate / 100)).toFixed(2)
  );
  const cgstAmount = new Prisma.Decimal((Number(subtotal) * (cgstRate / 100)).toFixed(2));
  const sgstAmount = new Prisma.Decimal((Number(subtotal) * (sgstRate / 100)).toFixed(2));
  const totalTax = cgstAmount.add(sgstAmount);
  const rawGrandTotal = subtotal.add(totalTax).add(serviceCharge);
  const grandTotal = new Prisma.Decimal(Math.round(Number(rawGrandTotal)).toFixed(2));
  const roundingDifference = grandTotal.sub(rawGrandTotal);

  const taxDetails = {
    cgstRate,
    cgstAmount: Number(cgstAmount.toFixed(2)),
    sgstRate,
    sgstAmount: Number(sgstAmount.toFixed(2)),
    serviceChargeRate,
    serviceChargeAmount: Number(serviceCharge.toFixed(2)),
    gstin: tenant?.gstin || null,
    taxes: [
      {
        name: `CGST (${cgstRate}%)`,
        ratePercentage: cgstRate,
        amount: Number(cgstAmount.toFixed(2)),
      },
      {
        name: `SGST (${sgstRate}%)`,
        ratePercentage: sgstRate,
        amount: Number(sgstAmount.toFixed(2)),
      },
    ],
    totalTax: Number(totalTax.toFixed(2)),
    discounts: [],
  };

  return { subtotal, serviceCharge, grandTotal, roundingDifference, taxDetails };
}

/** Discount amount on `subtotal`, capped at the subtotal. Percentage must be pre-validated (<= 100). */
export function calculateDiscountAmount(
  subtotal: number,
  discount: { type: "PERCENTAGE" | "FLAT"; value: number }
): number {
  let discountAmount =
    discount.type === "PERCENTAGE"
      ? Number(((subtotal * discount.value) / 100).toFixed(2))
      : Number(discount.value.toFixed(2));

  if (discountAmount > subtotal) {
    discountAmount = subtotal;
  }
  return discountAmount;
}

/** Re-taxed totals after a discount (flat 2.5% CGST + 2.5% SGST on the discounted subtotal). */
export function calculateDiscountedTotals(
  subtotal: number,
  discountAmount: number,
  serviceCharge: number
) {
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const cgstAmount = Number((discountedSubtotal * 0.025).toFixed(2));
  const sgstAmount = Number((discountedSubtotal * 0.025).toFixed(2));
  const totalTax = Number((cgstAmount + sgstAmount).toFixed(2));
  const grandTotal = Number((discountedSubtotal + totalTax + serviceCharge).toFixed(2));
  return { cgstAmount, sgstAmount, totalTax, grandTotal };
}

/** Map the stored payment status (plus collected amounts) to the API status label. */
function billStatusLabel(
  paymentStatus: BillPaymentStatus,
  paidAmount: number,
  dueAmount: number
): BillStatusLabel {
  if (paymentStatus === BillPaymentStatus.VOIDED) return "VOIDED";
  if (paymentStatus === BillPaymentStatus.PAID || dueAmount === 0) return "PAID";
  if (paymentStatus === BillPaymentStatus.PARTIALLY_PAID || paidAmount > 0) return "PARTIALLY_PAID";
  return "ISSUED";
}

/** Format a Prisma Bill (with items, payments, order.table/room/qrCode) for the API. */
export function formatBill(bill: BillWithDetails): FormattedBillResponse {
  const { order } = bill;
  const { table, room, qrCode } = order;

  const qrType: "TABLE" | "ROOM" = room ? "ROOM" : "TABLE";
  const identifier = room ? room.roomNumber : table?.tableNumber || "01";
  const displayName = room
    ? `Room ${room.roomNumber}`
    : table?.displayName || `Table ${table?.tableNumber || "01"}`;

  const items = bill.items.map((it) => ({
    id: it.id,
    name: it.itemName,
    quantity: it.quantity,
    unitPrice: Number(it.unitPrice.toFixed(2)),
    totalPrice: Number(it.totalPrice.toFixed(2)),
  }));

  const taxDetails = parseTaxDetails(bill.taxDetails);
  const taxes = Array.isArray(taxDetails.taxes) ? taxDetails.taxes : [];
  const discounts = Array.isArray(taxDetails.discounts) ? taxDetails.discounts : [];

  const paidAmount = sumSuccessfulPayments(bill.payments);
  const grandTotal = Number(bill.grandTotal.toFixed(2));
  const dueAmount = Math.max(0, Number((grandTotal - paidAmount).toFixed(2)));

  const payments = bill.payments.map((p) => ({
    id: p.id,
    billId: p.billId,
    orderId: bill.orderId,
    amount: Number(p.amount.toFixed(2)),
    method: p.paymentMethod === "ROOM_FOLIO" ? "ROOM_CHARGE" : p.paymentMethod,
    status: p.status,
    transactionReference: p.transactionReference,
    notes: p.notes,
    createdAt: p.createdAt.toISOString(),
  }));

  return {
    id: bill.id,
    billNumber: bill.billNumber,
    orderId: bill.orderId,
    orderNumber: order.orderNumber || "",
    qrContext: {
      type: qrType,
      identifier,
      displayName,
      token: qrCode?.token || "",
    },
    status: billStatusLabel(bill.paymentStatus, paidAmount, dueAmount),
    paymentStatus: bill.paymentStatus,
    items,
    subtotal: Number(bill.subtotal.toFixed(2)),
    discounts,
    totalDiscount: Number(bill.discountAmount.toFixed(2)),
    taxes,
    totalTax: Number(
      (taxDetails.totalTax ?? taxes.reduce((acc, t) => acc + (t.amount || 0), 0)).toFixed(2)
    ),
    serviceCharge: Number(bill.serviceCharge.toFixed(2)),
    roundOff: Number(bill.roundingDifference.toFixed(2)),
    grandTotal,
    paidAmount: Number(paidAmount.toFixed(2)),
    dueAmount,
    payments,
    voidedReason: taxDetails.voidedReason,
    settledAt: taxDetails.settledAt,
    createdAt: bill.createdAt.toISOString(),
    updatedAt: bill.updatedAt.toISOString(),
  };
}
