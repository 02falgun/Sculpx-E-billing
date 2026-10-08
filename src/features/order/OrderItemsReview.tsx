"use client";

import * as React from "react";
import { Order } from "@/types";
import { CurrencyDisplay } from "@/components/shared";
import { CreditCard, Wallet, Building2 } from "lucide-react";

interface OrderItemsReviewProps {
  order: Order;
}

export function OrderItemsReview({ order }: OrderItemsReviewProps) {
  const isRoom = order.qrContext.type === "ROOM";

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-sm font-semibold text-slate-900">Items Ordered</h3>
        <span className="text-xs text-slate-500 font-medium">
          {order.items.reduce((acc, i) => acc + i.quantity, 0)} items total
        </span>
      </div>

      {/* Item list */}
      <div className="divide-y divide-slate-100 space-y-3">
        {order.items.map((item) => (
          <div key={item.id} className="pt-3 first:pt-0 space-y-1">
            <div className="flex items-start justify-between text-xs">
              <div className="flex-1 pr-3">
                <span className="font-bold text-slate-900">
                  {item.quantity}x {item.name}
                </span>
                {item.modifiers && item.modifiers.length > 0 && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {item.modifiers.map((m) => m.name).join(", ")}
                  </p>
                )}
                {item.specialInstructions && (
                  <p className="text-[11px] text-amber-700 italic mt-0.5">
                    Note: “{item.specialInstructions}”
                  </p>
                )}
              </div>
              <div className="text-right">
                <CurrencyDisplay amount={item.totalPrice} className="font-semibold text-slate-900" />
                {item.quantity > 1 && (
                  <p className="text-[10px] text-slate-400">
                    <CurrencyDisplay amount={item.unitPrice} /> each
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pricing breakdown */}
      <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal</span>
          <CurrencyDisplay amount={order.subtotal} />
        </div>

        <div className="flex justify-between text-slate-600">
          <span>Estimated GST (5%)</span>
          <CurrencyDisplay amount={order.taxTotal} />
        </div>

        {order.discountTotal > 0 && (
          <div className="flex justify-between text-emerald-600 font-semibold">
            <span>Special Discount</span>
            <span>- <CurrencyDisplay amount={order.discountTotal} /></span>
          </div>
        )}

        <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-dashed border-slate-200">
          <span>Total Payable</span>
          <CurrencyDisplay
            amount={order.grandTotal}
            className="text-amber-600 font-black text-base"
          />
        </div>
      </div>

      {/* Payment preference badge */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
        {order.paymentPreference === "PAY_NOW" ? (
          <div className="flex items-center gap-2 text-slate-700">
            <CreditCard className="h-4 w-4 text-emerald-600" />
            <span>
              Payment Mode: <strong className="font-semibold text-slate-900">Prepaid Online</strong>
            </span>
          </div>
        ) : isRoom ? (
          <div className="flex items-center gap-2 text-slate-700">
            <Building2 className="h-4 w-4 text-blue-600" />
            <span>
              Payment Mode:{" "}
              <strong className="font-semibold text-slate-900">
                To be charged to Room {order.qrContext.identifier} Folio
              </strong>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-slate-700">
            <Wallet className="h-4 w-4 text-amber-600" />
            <span>
              Payment Mode:{" "}
              <strong className="font-semibold text-slate-900">Pay Later at Counter / Table</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
