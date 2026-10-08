"use client";

import * as React from "react";
import { BillingDeskTable } from "@/features/desk";
import { Receipt } from "lucide-react";

export default function StaffBillingPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-amber-600" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Central Billing & Cashier Desk
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Review open guest tabs, settle payments, print thermal receipts, and audit transactions
        </p>
      </div>

      <BillingDeskTable />
    </div>
  );
}
