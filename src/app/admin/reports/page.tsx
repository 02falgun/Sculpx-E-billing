"use client";

import * as React from "react";
import { BarChart3, TrendingUp, IndianRupee, Users, Clock, Calendar } from "lucide-react";
import { CurrencyDisplay } from "@/components/shared";

export default function AdminReportsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-slate-800" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Revenue &amp; Analytics Reports
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Historical sales, average guest spend, top-performing culinary categories, and peak dining hours.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Monthly Gross Sales</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            <CurrencyDisplay amount={1284500} />
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">+18.2% vs last month</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Total Guest Orders</span>
          <div className="text-2xl font-black text-slate-900 mt-1">1,420 Orders</div>
          <span className="text-[11px] text-slate-400">92% QR placed</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Average Order Value</span>
          <div className="text-2xl font-black text-slate-900 mt-1">₹904.50</div>
          <span className="text-[11px] text-emerald-600 font-medium">+5.4% portion modifier add-ons</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">GST Tax Remittance</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            <CurrencyDisplay amount={64225} />
          </div>
          <span className="text-[11px] text-slate-400">CGST 2.5% + SGST 2.5%</span>
        </div>
      </div>
    </div>
  );
}
