"use client";

import * as React from "react";
import { OrdersList } from "@/features/orders";
import { FileText } from "lucide-react";

export default function WaiterOrdersPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-amber-600" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Active Orders
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Track customer QR orders and table-side orders with real-time status progression.
        </p>
      </div>

      <OrdersList />
    </div>
  );
}
