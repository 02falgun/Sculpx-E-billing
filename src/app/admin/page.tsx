"use client";

import * as React from "react";
import { AdminDashboardOverview } from "@/features/admin";
import { ShieldCheck } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-amber-600" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Hotel Back-Office Overview
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Shift performance metrics, hardware status, and menu inventory controls
        </p>
      </div>

      <AdminDashboardOverview />
    </div>
  );
}
