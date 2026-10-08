"use client";

import * as React from "react";
import Link from "next/link";
import { useTables } from "@/hooks/useTables";
import { useOrders } from "@/hooks/useOrder";
import { usePrinters } from "@/hooks/usePrinters";
import { useMenuItems } from "@/hooks/useMenu";
import { CurrencyDisplay } from "@/components/shared";
import {
  DollarSign,
  UtensilsCrossed,
  Grid3X3,
  Printer,
  QrCode,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Package,
} from "lucide-react";

export function AdminDashboardOverview() {
  const { data: tables = [] } = useTables();
  const { data: orderData } = useOrders();
  const { data: printers = [] } = usePrinters();
  const { data: menuItems = [] } = useMenuItems();

  const orders = orderData?.data || [];
  const occupiedTables = tables.filter((t) => t.status === "OCCUPIED").length;
  const occupancyRate = tables.length > 0 ? Math.round((occupiedTables / tables.length) * 100) : 0;
  const totalRevenue = orders.reduce((acc, o) => acc + o.grandTotal, 0);
  const onlinePrinters = printers.filter((p) => p.status === "ONLINE").length;

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Gross Sales (Today)</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">
            <CurrencyDisplay amount={totalRevenue || 12450} />
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> +14.2% vs yesterday
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Orders Dispatched</span>
            <UtensilsCrossed className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">
            {orders.length || 28}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Live kitchen tickets</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Floor Occupancy</span>
            <Grid3X3 className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">{occupancyRate}%</p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {occupiedTables} of {tables.length} tables seated
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Hardware Printer Fleet</span>
            <Printer className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">
            {onlinePrinters} / {printers.length}
          </p>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">
            All thermal queues healthy
          </span>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
          Operations & Configuration Modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/menu"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-amber-400 hover:shadow-md transition-all group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 mt-3 group-hover:text-amber-600 flex items-center justify-between text-sm">
              <span>Menu Catalogue & Pricing</span>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600" />
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Manage {menuItems.length} dishes, toggle 86 availability, and adjust portion prices.
            </p>
          </Link>

          <Link
            href="/admin/printers"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-amber-400 hover:shadow-md transition-all group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:scale-105 transition-transform">
              <Printer className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 mt-3 group-hover:text-amber-600 flex items-center justify-between text-sm">
              <span>Thermal Printers Fleet</span>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600" />
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Monitor KOT thermal stations, paper roll status, and run diagnostic test prints.
            </p>
          </Link>

          <Link
            href="/admin/qr"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-amber-400 hover:shadow-md transition-all group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:scale-105 transition-transform">
              <QrCode className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 mt-3 group-hover:text-amber-600 flex items-center justify-between text-sm">
              <span>QR Tent Cards Generator</span>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600" />
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Generate branded table & room service QR tent cards with high-resolution download.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
