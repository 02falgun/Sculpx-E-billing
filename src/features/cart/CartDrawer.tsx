"use client";

import * as React from "react";
import Link from "next/link";
import { useCartStore, useUIStore } from "@/store";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CurrencyDisplay } from "@/components/shared";
import { Plus, Minus, Trash2, ArrowRight, ShoppingBag } from "lucide-react";

export function CartDrawer() {
  const isCartDrawerOpen = useUIStore((s) => s.isCartDrawerOpen);
  const setCartDrawerOpen = useUIStore((s) => s.setCartDrawerOpen);

  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const getSummary = useCartStore((s) => s.getSummary);

  const summary = getSummary();

  return (
    <Drawer
      isOpen={isCartDrawerOpen}
      onClose={() => setCartDrawerOpen(false)}
      title="Your Food Order"
      position="right"
    >
      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6 text-slate-400" />}
          title="Your cart is empty"
          description="Looks like you haven't added anything to your order yet."
          actionLabel="Browse Menu"
          onAction={() => setCartDrawerOpen(false)}
        />
      ) : (
        <div className="flex flex-col h-full justify-between">
          {/* Items List */}
          <div className="space-y-3 divide-y divide-slate-100 max-h-[60vh] overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.id} className="pt-3 first:pt-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{item.item.name}</h4>
                    <p className="text-xs font-semibold text-slate-500">
                      <CurrencyDisplay amount={item.unitPrice} />
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    aria-label={`Remove ${item.item.name}`}
                    className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Modifiers selected */}
                {item.selectedModifiers.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.selectedModifiers.map((mod) => (
                      <span
                        key={mod.modifierId}
                        className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                      >
                        +{mod.name} {mod.price > 0 && `(₹${mod.price})`}
                      </span>
                    ))}
                  </div>
                )}

                {item.specialInstructions && (
                  <p className="mt-1 text-[11px] italic text-slate-400">
                    &quot;{item.specialInstructions}&quot;
                  </p>
                )}

                {/* Quantity Controls & Row Total */}
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      aria-label="Decrease quantity"
                      className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-700 shadow-xs hover:bg-slate-100 active:scale-95"
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
                      className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-700 shadow-xs hover:bg-slate-100 active:scale-95"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <span className="text-sm font-bold text-slate-900">
                    <CurrencyDisplay amount={item.totalPrice} />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Bill Breakdown & Checkout Button */}
          <div className="mt-6 border-t border-slate-100 pt-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Subtotal</span>
              <CurrencyDisplay amount={summary.subtotal} />
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Estimated GST (5%)</span>
              <CurrencyDisplay amount={summary.estimatedTax} />
            </div>
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-dashed border-slate-200">
              <span>Total Payable</span>
              <CurrencyDisplay amount={summary.estimatedTotal} className="text-amber-800 font-bold" />
            </div>

            <div className="mt-4 flex flex-col gap-2 pt-2">
              <Link
                href="/checkout"
                onClick={() => setCartDrawerOpen(false)}
                className="w-full"
              >
                <Button
                  variant="primary"
                  size="md"
                  className="w-full text-xs font-semibold shadow-xs"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                >
                  <span>Proceed to Checkout • </span>
                  <CurrencyDisplay amount={summary.estimatedTotal} className="text-white ml-1 font-bold" />
                </Button>
              </Link>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCartDrawerOpen(false)}
                  className="flex-1 text-xs font-medium"
                >
                  Continue Browsing
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCart}
                  className="text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  Clear Order
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
