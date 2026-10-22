"use client";

import * as React from "react";
import { POSTerminal } from "@/features/staff/POSTerminal";
import { UtensilsCrossed } from "lucide-react";

export default function StaffPOSPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-amber-600" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Point of Sale (POS) Terminal
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Fast waiter order entry, table & room service tickets, and direct KOT dispatch
        </p>
      </div>

      <POSTerminal />
    </div>
  );
}
