"use client";

import * as React from "react";
import { BillingDeskTable } from "@/features/desk";
import { Receipt } from "lucide-react";

export default function ManagerBillingPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-purple-600" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Billing &amp; Revenue Operations
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Monitor settlement velocity, cash drawers, discounts, and tax collections.
        </p>
      </div>

      <BillingDeskTable />
    </div>
  );
}
