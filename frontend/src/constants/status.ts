import { OrderStatus, KOTStatus, BillStatus, PaymentStatus } from "@/types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_VALIDATION: "Validating",
  PLACED: "Order Placed",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing in Kitchen",
  READY: "Ready to Serve",
  SERVED: "Served",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const KOT_STATUS_LABELS: Record<KOTStatus, string> = {
  NEW: "New Ticket",
  ACCEPTED: "Accepted",
  PREPARING: "In Prep",
  READY: "Ready for Pickup",
  SERVED: "Served",
  CANCELLED: "Voided",
};

export const BILL_STATUS_LABELS: Record<BillStatus, string> = {
  DRAFT: "Draft Bill",
  ISSUED: "Bill Issued",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid & Settled",
  VOIDED: "Voided",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: "Pending Verification",
  SUCCESS: "Payment Completed",
  FAILED: "Payment Failed",
  REFUNDED: "Refunded",
};
