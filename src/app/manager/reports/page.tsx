"use client";

import * as React from "react";
import { BarChart3, TrendingUp, Users, DollarSign, Clock } from "lucide-react";
import { CurrencyDisplay } from "@/components/shared";

export default function ManagerReportsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-600" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Shift Performance Reports
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Operational telemetry: covers, average dining duration, peak ordering hours, and ticket size.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Average Ticket Value</span>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">₹1,180</div>
          <p className="text-[11px] text-emerald-600 mt-1">+8.4% compared to last week</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Average Turn Time</span>
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">42 mins</div>
          <p className="text-[11px] text-slate-500 mt-1">Seated to settlement duration</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs">
            <span>Total Guests Served</span>
            <Users className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">148 Covers</div>
          <p className="text-[11px] text-purple-600 mt-1">Heritage dining &amp; suites</p>
        </div>
      </div>
    </div>
  );
}
