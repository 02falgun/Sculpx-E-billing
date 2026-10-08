"use client";

import * as React from "react";
import Link from "next/link";
import { Order } from "@/types";
import { QRContextBadge } from "@/components/shared";
import { useWebSocketConnection } from "@/hooks/useWebSocket";
import { ArrowLeft, Clock, Wifi, WifiOff } from "lucide-react";

interface LiveTrackingHeaderProps {
  order: Order;
}

export function LiveTrackingHeader({ order }: LiveTrackingHeaderProps) {
  const wsState = useWebSocketConnection();
  const menuHref = `/menu/${order.qrContext.token}`;

  const formattedTime = React.useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-IN", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      }).format(new Date(order.createdAt));
    } catch {
      return "";
    }
  }, [order.createdAt]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      {/* Top action row */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <Link
          href={menuHref}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-amber-600 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Menu</span>
        </Link>

        {/* Live sync connection badge */}
        <div className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 border border-slate-100 text-[11px] font-medium">
          {wsState === "CONNECTED" ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-700 flex items-center gap-1">
                <Wifi className="h-3 w-3" /> Live Sync
              </span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-amber-400"></span>
              <span className="text-amber-700 flex items-center gap-1">
                <WifiOff className="h-3 w-3" /> Reconnecting...
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main details */}
      <div className="pt-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              Order #{order.orderNumber}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              Placed at {formattedTime}
            </span>
            {order.customerName && (
              <>
                <span>•</span>
                <span className="font-medium text-slate-700">For {order.customerName}</span>
              </>
            )}
          </div>
        </div>

        <div>
          <QRContextBadge context={order.qrContext} />
        </div>
      </div>
    </div>
  );
}
