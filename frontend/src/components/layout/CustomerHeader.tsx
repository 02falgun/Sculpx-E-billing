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
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Left: Context Badge */}
        <div className="flex items-center gap-3">
          {qrContext ? (
            <QRContextBadge context={qrContext} />
          ) : (
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold text-neutral-900 tracking-tight">
                SCULPX
              </span>
              <span className="text-[10px] text-neutral-500">Scan QR to order</span>
            </div>
          )}
        </div>

        {/* Right: Socket Status & Cart Button */}
        <div className="flex items-center gap-2.5">
          {/* Live Sync Status indicator */}
          <div
            className="flex items-center gap-1.5 rounded-full bg-neutral-100 border border-neutral-200 px-2.5 py-1 text-[11px] font-medium text-neutral-600"
            title={isConnected ? "Live Connected" : "Connecting..."}
          >
            {isConnected ? (
              <>
                <span className="h-2 w-2 rounded-full bg-neutral-900" />
                <span className="text-[11px] font-semibold text-neutral-800">Live</span>
              </>
            ) : (
              <>
                <span className="h-2 w-2 rounded-full bg-neutral-400 animate-pulse" />
                <span className="text-[11px] font-medium text-neutral-500">Connecting</span>
              </>
            )}
          </div>

          {/* Cart Trigger */}
          <button
            type="button"
            onClick={() => setCartDrawerOpen(true)}
            aria-label={`View shopping cart with ${summary.totalItems} items`}
            className="relative flex h-9 items-center gap-2 rounded-md bg-black px-3.5 text-xs font-semibold text-white hover:bg-neutral-800 active:scale-95 transition-all cursor-pointer"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Cart</span>
            {summary.totalItems > 0 && (
              <span className="flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-black">
                {summary.totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
