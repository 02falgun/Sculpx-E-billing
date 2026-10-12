"use client";

import * as React from "react";
import { useOrders } from "@/hooks/useOrder";
import { BarChart3, TrendingUp, IndianRupee, Users, Clock, Calendar, AlertCircle } from "lucide-react";
import { CurrencyDisplay } from "@/components/shared";

export default function AdminReportsPage() {
  const { data: orderData } = useOrders();
  const orders = orderData?.data || [];

  const totalSales = orders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  const totalTax = orders.reduce((sum, o) => sum + (o.taxTotal || 0), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

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
          Authoritative financial metrics and order summaries calculated directly from persisted invoices and bills.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Total Revenue Recorded</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            <CurrencyDisplay amount={totalSales} />
          </div>
          <span className="text-[11px] text-slate-400">
            {totalOrders > 0 ? "From live settled bills" : "No orders settled yet"}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Total Orders Processed</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {totalOrders} Orders
          </div>
          <span className="text-[11px] text-slate-400">
            {totalOrders > 0 ? "Persisted in database" : "Awaiting first order"}
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Average Order Value</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            <CurrencyDisplay amount={avgOrderValue} />
          </div>
          <span className="text-[11px] text-slate-400">Calculated per bill</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <span className="text-xs text-slate-500 font-semibold">Taxes Collected</span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            <CurrencyDisplay amount={totalTax} />
          </div>
          <span className="text-[11px] text-slate-400">CGST + SGST remittance</span>
        </div>
      </div>
    </div>
  );
}
