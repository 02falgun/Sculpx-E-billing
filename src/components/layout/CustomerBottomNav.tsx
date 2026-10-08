"use client";

import * as React from "react";
import { useCartStore, useUIStore } from "@/store";
import { CurrencyDisplay } from "@/components/shared";
import { ShoppingBag, ArrowRight } from "lucide-react";

export function CustomerBottomNav() {
  const getSummary = useCartStore((s) => s.getSummary);
  const setCartDrawerOpen = useUIStore((s) => s.setCartDrawerOpen);

  const summary = getSummary();

  if (summary.totalItems === 0) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 p-3 sm:hidden pointer-events-none">
      <div className="mx-auto max-w-md pointer-events-auto">
        <button
          type="button"
          onClick={() => setCartDrawerOpen(true)}
          className="flex w-full items-center justify-between rounded-lg bg-black px-4 py-3 text-white shadow-md hover:bg-neutral-900 active:scale-[0.99] transition-all cursor-pointer border border-neutral-800"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-neutral-800 text-white">
              <ShoppingBag className="h-4 w-4" />
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xs font-semibold">
                {summary.totalItems} {summary.totalItems === 1 ? "Item" : "Items"}
              </span>
              <span className="text-xs text-neutral-300">
                <CurrencyDisplay amount={summary.estimatedTotal} className="text-white" />
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-semibold">
            <span>View Cart</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </button>
      </div>
    </div>
  );
}
