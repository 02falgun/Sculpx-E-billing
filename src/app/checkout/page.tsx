"use client";

import * as React from "react";
import Link from "next/link";
import { useCartStore } from "@/store";
import { CheckoutForm, OrderSummaryCard } from "@/features/checkout";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShoppingBag, ArrowLeft } from "lucide-react";

export default function CheckoutPage() {
  const items = useCartStore((s) => s.items);
  const qrContext = useCartStore((s) => s.qrContext);
  const getSummary = useCartStore((s) => s.getSummary);

  const summary = getSummary();
  const menuLink = qrContext ? `/menu/${qrContext.token}` : "/";

  if (items.length === 0) {
    return (
      <div className="py-12 max-w-md mx-auto text-center">
        <EmptyState
          icon={<ShoppingBag className="h-8 w-8 text-slate-400" />}
          title="No Items to Checkout"
          description="Your cart is currently empty. Please choose your items from the menu before checking out."
          actionLabel="Go to Menu"
          onAction={() => window.location.assign(menuLink)}
        />
      </div>
    );
  }

  return (
    <div className="pb-24 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Checkout & Order</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Confirm items and dining preference for {qrContext?.displayName || "Dining"}
          </p>
        </div>

        <Link
          href="/cart"
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Edit Cart</span>
        </Link>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Checkout Form */}
        <div className="lg:col-span-7">
          <CheckoutForm />
        </div>

        {/* Right: Order Summary Card */}
        <div className="lg:col-span-5 sticky top-20">
          <OrderSummaryCard items={items} summary={summary} context={qrContext} />
        </div>
      </div>
    </div>
  );
}
