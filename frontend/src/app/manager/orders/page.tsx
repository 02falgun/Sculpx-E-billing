"use client";

import * as React from "react";
import { OrdersList } from "@/features/orders";
import { FileText } from "lucide-react";

export default function ManagerOrdersPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-purple-600" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Floor Orders Overview
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Complete cross-pavilion order lifecycle audit, cancellation logs, and status velocity.
        </p>
      </div>

      <OrdersList />
    </div>
  );
}
