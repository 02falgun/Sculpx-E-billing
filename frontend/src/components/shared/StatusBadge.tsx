import * as React from "react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
  OrderStatus,
  KOTStatus,
  BillStatus,
  PaymentStatus,
} from "@/types";
import {
  ORDER_STATUS_LABELS,
  KOT_STATUS_LABELS,
  BILL_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/constants";

export interface StatusBadgeProps {
  status: OrderStatus | KOTStatus | BillStatus | PaymentStatus;
  type?: "order" | "kot" | "bill" | "payment";
  className?: string;
}

export function StatusBadge({ status, type = "order", className }: StatusBadgeProps) {
  let label: string = status;
  let variant: "default" | "secondary" | "success" | "warning" | "destructive" | "outline" | "accent" =
    "secondary";

  if (type === "order") {
    label = ORDER_STATUS_LABELS[status as OrderStatus] || status;
    switch (status) {
      case "PLACED":
      case "PENDING_VALIDATION":
        variant = "outline";
        break;
      case "CONFIRMED":
        variant = "secondary";
        break;
      case "PREPARING":
        variant = "accent";
        break;
      case "READY":
        variant = "default";
        break;
      case "SERVED":
      case "COMPLETED":
        variant = "default";
        break;
      case "CANCELLED":
        variant = "destructive";
        break;
    }
  } else if (type === "kot") {
    label = KOT_STATUS_LABELS[status as KOTStatus] || status;
    switch (status) {
      case "NEW":
        variant = "outline";
        break;
      case "ACCEPTED":
        variant = "secondary";
        break;
      case "PREPARING":
        variant = "accent";
        break;
      case "READY":
        variant = "default";
        break;
      case "SERVED":
        variant = "secondary";
        break;
      case "CANCELLED":
        variant = "destructive";
        break;
    }
  } else if (type === "bill") {
    label = BILL_STATUS_LABELS[status as BillStatus] || status;
    switch (status) {
      case "DRAFT":
        variant = "outline";
        break;
      case "ISSUED":
      case "PARTIALLY_PAID":
        variant = "secondary";
        break;
      case "PAID":
        variant = "default";
        break;
      case "VOIDED":
        variant = "destructive";
        break;
    }
  } else if (type === "payment") {
    label = PAYMENT_STATUS_LABELS[status as PaymentStatus] || status;
    switch (status) {
      case "PENDING":
        variant = "outline";
        break;
      case "SUCCESS":
        variant = "default";
        break;
      case "FAILED":
      case "REFUNDED":
        variant = "destructive";
        break;
    }
  }

  return (
    <Badge variant={variant} className={cn("inline-flex items-center gap-1.5 font-medium", className)}>
      <span className="h-1.5 w-1.5 rounded-full inline-block shrink-0 bg-current opacity-70" aria-hidden="true" />
      <span>{label}</span>
    </Badge>
  );
}
