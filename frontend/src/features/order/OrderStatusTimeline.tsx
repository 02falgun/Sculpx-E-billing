"use client";

import * as React from "react";
import { Order, OrderStatus } from "@/types";
import { StatusBadge } from "@/components/shared";
import {
  CheckCircle2,
  Clock,
  ChefHat,
  Flame,
  UtensilsCrossed,
  Check,
  AlertTriangle,
  Info,
} from "lucide-react";

interface OrderStatusTimelineProps {
  order: Order;
}

interface StepDefinition {
  status: OrderStatus;
  label: string;
  description: string;
  icon: React.ElementType;
}

const ORDER_STEPS: StepDefinition[] = [
  {
    status: "PLACED",
    label: "Order Placed",
    description: "Sent to hotel kitchen",
    icon: Clock,
  },
  {
    status: "CONFIRMED",
    label: "Confirmed",
    description: "Kitchen captain accepted",
    icon: ChefHat,
  },
  {
    status: "PREPARING",
    label: "Preparing",
    description: "Chef is cooking",
    icon: Flame,
  },
  {
    status: "READY",
    label: "Food Ready",
    description: "Plated & ready for service",
    icon: UtensilsCrossed,
  },
  {
    status: "SERVED",
    label: "Served",
    description: "Delivered to table/room",
    icon: CheckCircle2,
  },
];

const STATUS_WEIGHT: Record<OrderStatus, number> = {
  PENDING_VALIDATION: 0,
  PLACED: 1,
  CONFIRMED: 2,
  PREPARING: 3,
  READY: 4,
  SERVED: 5,
  COMPLETED: 5,
  CANCELLED: -1,
};

export function OrderStatusTimeline({ order }: OrderStatusTimelineProps) {
  const isCancelled = order.status === "CANCELLED";
  const currentWeight = STATUS_WEIGHT[order.status] ?? 1;

  // Approximate remaining minutes based on preparation stage
  const estimatedTimeText = React.useMemo(() => {
    switch (order.status) {
      case "PLACED":
        return "Estimated wait: ~20-25 mins";
      case "CONFIRMED":
        return "Estimated wait: ~15-20 mins";
      case "PREPARING":
        return "Cooking underway: ~10 mins";
      case "READY":
        return "Delivering shortly to your table";
      case "SERVED":
      case "COMPLETED":
        return "Order served! Enjoy your meal";
      default:
        return null;
    }
  }, [order.status]);

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-6">
      {/* Header with status badge */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Live Order Status</h2>
          {estimatedTimeText && !isCancelled && (
            <p className="text-xs text-amber-700 font-medium mt-0.5">
              {estimatedTimeText}
            </p>
          )}
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Cancelled state banner */}
      {isCancelled ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 space-y-2">
          <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <span>This order was cancelled</span>
          </div>
          {order.cancellation && (
            <div className="text-xs text-rose-700 space-y-1 pl-6">
              <p>
                <span className="font-semibold">Reason:</span> {order.cancellation.reason}
              </p>
              {order.cancellation.refundStatus === "PENDING" && (
                <p className="text-[11px] font-medium text-rose-600">
                  Refund of online payment will be initiated back to your original source within 3-5 business days.
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Multi-step progress timeline */
        <div className="relative">
          <div className="space-y-6">
            {ORDER_STEPS.map((step, index) => {
              const stepWeight = STATUS_WEIGHT[step.status];
              const isDone = currentWeight > stepWeight;
              const isCurrent = currentWeight === stepWeight;
              const isPending = currentWeight < stepWeight;

              const Icon = step.icon;

              return (
                <div key={step.status} className="relative flex items-start gap-4">
                  {/* Connecting Line */}
                  {index < ORDER_STEPS.length - 1 && (
                    <div
                      className={`absolute left-4 top-8 -bottom-6 w-0.5 -ml-[1px] transition-colors duration-300 ${
                        isDone ? "bg-emerald-600" : "bg-slate-200"
                      }`}
                    />
                  )}

                  {/* Icon Node */}
                  <div className="relative z-10">
                    {isDone ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-2xs ring-4 ring-emerald-50">
                        <Check className="h-4 w-4 stroke-[3]" />
                      </div>
                    ) : isCurrent ? (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 text-white shadow-xs ring-4 ring-amber-100">
                        <Icon className="h-4 w-4" />
                      </div>
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 border border-slate-200">
                        <Icon className="h-4 w-4" />
                      </div>
                    )}
                  </div>

                  {/* Content details */}
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-xs font-bold ${
                          isCurrent
                            ? "text-amber-600 font-extrabold"
                            : isDone
                            ? "text-slate-900"
                            : "text-slate-400"
                        }`}
                      >
                        {step.label}
                      </p>
                    </div>
                    <p
                      className={`text-[11px] ${
                        isCurrent
                          ? "text-slate-700 font-medium"
                          : isDone
                          ? "text-slate-500"
                          : "text-slate-400"
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Special cooking instructions notice if present */}
      {order.specialInstructions && (
        <div className="flex items-start gap-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 p-3 text-xs text-amber-900">
          <Info className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Order Note to Chef:</span>
            <p className="italic text-slate-700">“{order.specialInstructions}”</p>
          </div>
        </div>
      )}
    </div>
  );
}
