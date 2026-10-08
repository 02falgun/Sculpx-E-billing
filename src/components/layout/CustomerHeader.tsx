"use client";

import * as React from "react";
import { useCartStore, useUIStore } from "@/store";
import { useWebSocketConnection } from "@/hooks/useWebSocket";
import { QRContextBadge } from "@/components/shared";
import { ShoppingBag, Wifi, WifiOff } from "lucide-react";

export function CustomerHeader() {
  const qrContext = useCartStore((s) => s.qrContext);
  const getSummary = useCartStore((s) => s.getSummary);
  const setCartDrawerOpen = useUIStore((s) => s.setCartDrawerOpen);
  const wsState = useWebSocketConnection();

  const summary = getSummary();
  const isConnected = wsState === "CONNECTED";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Left: Context Badge */}
        <div className="flex items-center gap-3">
          {qrContext ? (
            <QRContextBadge context={qrContext} />
          ) : (
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold text-slate-900 tracking-tight">
                Restro E-Billing
              </span>
              <span className="text-[10px] text-slate-500">Scan QR to order</span>
            </div>
          )}
        </div>

        {/* Right: Socket Status & Cart Button */}
        <div className="flex items-center gap-2.5">
          {/* Live Sync Status indicator */}
          <div
            className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600"
            title={isConnected ? "Live Connected" : "Connecting..."}
          >
            {isConnected ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <Wifi className="h-3 w-3 text-emerald-600" />
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                <WifiOff className="h-3 w-3 text-amber-600" />
              </>
            )}
          </div>

          {/* Cart Trigger */}
          <button
            type="button"
            onClick={() => setCartDrawerOpen(true)}
            aria-label={`View shopping cart with ${summary.totalItems} items`}
            className="relative flex h-10 items-center gap-2 rounded-xl bg-amber-600 px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 active:scale-95 transition-all"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {summary.totalItems > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1.5 text-[10px] font-bold text-amber-700">
                {summary.totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
