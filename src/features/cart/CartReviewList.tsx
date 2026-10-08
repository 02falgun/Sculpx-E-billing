"use client";

import * as React from "react";
import Link from "next/link";
import { useCartStore } from "@/store";
import { Button } from "@/components/ui/Button";
import { CurrencyDisplay, DietIndicator } from "@/components/shared";
import { EmptyState } from "@/components/ui/EmptyState";
import { Plus, Minus, Trash2, ArrowRight, ArrowLeft, ShoppingBag } from "lucide-react";

export function CartReviewList() {
  const items = useCartStore((s) => s.items);
  const qrContext = useCartStore((s) => s.qrContext);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const getSummary = useCartStore((s) => s.getSummary);

  const summary = getSummary();
  const menuLink = qrContext ? `/menu/${qrContext.token}` : "/";

  if (items.length === 0) {
    return (
      <div className="py-12 max-w-md mx-auto text-center">
        <EmptyState
          icon={<ShoppingBag className="h-8 w-8 text-slate-400" />}
          title="Your Cart is Empty"
          description="Explore our curated starters, signature mains, and artisanal beverages to begin your order."
          actionLabel="Browse Menu"
          onAction={() => window.location.assign(menuLink)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24 max-w-3xl mx-auto">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Review Your Order</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {summary.totalItems} {summary.totalItems === 1 ? "item" : "items"} selected for{" "}
            {qrContext?.displayName || "Dining"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href={menuLink}>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
              className="text-xs"
            >
              Add More Dishes
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearCart}
            className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Cart Items List */}
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs transition-all hover:shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <DietIndicator type={item.item.dietaryType} showLabel />
                  <h3 className="text-sm font-bold text-slate-900">{item.item.name}</h3>
                </div>

                {/* Modifiers */}
                {item.selectedModifiers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {item.selectedModifiers.map((mod) => (
                      <span
                        key={mod.modifierId}
                        className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                      >
                        +{mod.name} {mod.price > 0 && `(₹${mod.price})`}
                      </span>
                    ))}
                  </div>
                )}

                {item.specialInstructions && (
                  <p className="mt-1.5 text-xs italic text-slate-500 bg-slate-50 rounded-lg p-1.5 inline-block">
                    &quot;{item.specialInstructions}&quot;
                  </p>
                )}
              </div>

              {/* Delete button */}
              <button
                type="button"
                onClick={() => removeItem(item.id)}
                aria-label={`Remove ${item.item.name}`}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* Stepper & Line Price */}
            <div className="mt-3.5 flex items-center justify-between border-t border-slate-100 pt-3">
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  aria-label="Decrease quantity"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-700 shadow-xs hover:bg-slate-100 active:scale-95"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-8 text-center text-xs font-bold text-slate-900">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  aria-label="Increase quantity"
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-700 shadow-xs hover:bg-slate-100 active:scale-95"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              <div className="text-right">
                <CurrencyDisplay amount={item.totalPrice} className="text-base font-extrabold text-slate-900" />
                <span className="block text-[10px] text-slate-400">
                  ₹{item.unitPrice} each
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bill Breakdown */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-2.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
          Estimated Charges
        </h4>

        <div className="flex justify-between text-xs text-slate-600">
          <span>Item Subtotal</span>
          <CurrencyDisplay amount={summary.subtotal} />
        </div>
        <div className="flex justify-between text-xs text-slate-600">
          <span>Estimated Taxes (CGST 2.5% + SGST 2.5%)</span>
          <CurrencyDisplay amount={summary.estimatedTax} />
        </div>
        <div className="flex justify-between text-base font-extrabold text-slate-900 border-t border-dashed border-slate-200 pt-3">
          <span>Estimated Total</span>
          <CurrencyDisplay
            amount={summary.estimatedTotal}
            className="text-amber-700 font-black text-lg"
          />
        </div>
      </div>

      {/* Checkout Action Button */}
      <div className="pt-2">
        <Link href="/checkout" className="block w-full">
          <Button
            variant="primary"
            size="lg"
            className="w-full font-bold shadow-lg shadow-amber-600/25"
            rightIcon={<ArrowRight className="h-4 w-4" />}
          >
            <span>Proceed to Checkout • </span>
            <CurrencyDisplay amount={summary.estimatedTotal} className="text-white ml-1 font-black" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
