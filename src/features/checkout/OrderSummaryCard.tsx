"use client";

import * as React from "react";
import { CartItem, CartSummary, QRContext } from "@/types";
import { CurrencyDisplay, QRContextBadge } from "@/components/shared";

export interface OrderSummaryCardProps {
  items: CartItem[];
  summary: CartSummary;
  context: QRContext | null;
  className?: string;
}

export function OrderSummaryCard({
  items,
  summary,
  context,
  className,
}: OrderSummaryCardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 ${
        className || ""
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-900">Order Summary</h3>
        <QRContextBadge context={context} />
      </div>

      {/* Items list */}
      <div className="space-y-2.5 max-h-60 overflow-y-auto divide-y divide-slate-100 pr-1">
        {items.map((item) => (
          <div key={item.id} className="pt-2.5 first:pt-0">
            <div className="flex items-start justify-between text-xs">
              <div className="flex-1 pr-2">
                <span className="font-bold text-slate-900">
                  {item.quantity}x {item.item.name}
                </span>
                {item.selectedModifiers.length > 0 && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {item.selectedModifiers.map((m) => m.name).join(", ")}
                  </p>
                )}
                {item.specialInstructions && (
                  <p className="text-[10px] italic text-slate-400 mt-0.5">
                    &quot;{item.specialInstructions}&quot;
                  </p>
                )}
              </div>
              <CurrencyDisplay amount={item.totalPrice} className="font-semibold text-slate-800" />
            </div>
          </div>
        ))}
      </div>

      {/* Taxes and totals */}
      <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
        <div className="flex justify-between text-slate-500">
          <span>Subtotal</span>
          <CurrencyDisplay amount={summary.subtotal} />
        </div>
        <div className="flex justify-between text-slate-500">
          <span>Estimated GST (5%)</span>
          <CurrencyDisplay amount={summary.estimatedTax} />
        </div>
        <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-dashed border-slate-200">
          <span>Total Amount</span>
          <CurrencyDisplay
            amount={summary.estimatedTotal}
            className="text-amber-700 font-extrabold text-base"
          />
        </div>
      </div>
    </div>
  );
}
