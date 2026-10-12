"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTables, useRooms } from "@/hooks/useTables";
import { useOrders } from "@/hooks/useOrder";
import { useMenuItems } from "@/hooks/useMenu";
import { tenantApi } from "@/services/api";
import { CurrencyDisplay } from "@/components/shared";
import { Spinner } from "@/components/ui/Spinner";
import {
  DollarSign,
  UtensilsCrossed,
  Grid3X3,
  Printer,
  QrCode,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  BedDouble,
  Users,
  Settings,
  Sparkles,
  Layers,
} from "lucide-react";

export function AdminDashboardOverview() {
  const { data: tables = [] } = useTables();
  const { data: rooms = [] } = useRooms();
  const { data: orderData } = useOrders();
  const { data: menuItems = [] } = useMenuItems();

  const { data: readinessData, isLoading: isLoadingReadiness } = useQuery({
    queryKey: ["pilotReadiness"],
    queryFn: async () => {
      const res = await tenantApi.getReadiness();
      if (!res.success) return null;
      return res.data;
    },
  });

  const orders = orderData?.data || [];
  const occupiedTables = tables.filter((t) => t.status === "OCCUPIED").length;
  const occupancyRate = tables.length > 0 ? Math.round((occupiedTables / tables.length) * 100) : 0;
  const totalRevenue = orders.reduce((acc, o) => acc + (o.grandTotal || 0), 0);

  const readiness = readinessData?.readiness;
  const metrics = readinessData?.metrics;
  const isPilotReady = readiness?.isPilotReady ?? (tables.length > 0 && menuItems.length > 0);
  const readinessPercentage =
    readiness?.percentage ??
    (isPilotReady
      ? 100
      : Math.round(((tables.length > 0 ? 1 : 0) + (menuItems.length > 0 ? 1 : 0) + (rooms.length > 0 ? 1 : 0)) * 33.3));

  return (
    <div className="space-y-8">
      {/* Pilot Readiness & Guided Setup Wizard Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Hotel &amp; Restaurant Setup Readiness
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Configuration checklist for launching your live customer and guestroom ordering pilot.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border ${
                isPilotReady
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {isPilotReady ? "Ready for Live Pilot" : "Setup In Progress"}
            </span>
            <span className="text-sm font-black text-slate-900">
              {readinessPercentage}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isPilotReady ? "bg-emerald-600" : "bg-amber-500"
            }`}
            style={{ width: `${readinessPercentage}%` }}
          />
        </div>

        {/* Checklist Steps Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {/* Step 1: Legal Profile & Tax */}
          <Link
            href="/admin/settings"
            className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/80 transition-all flex flex-col justify-between space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 1</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block group-hover:text-blue-600">
                Property &amp; Taxes
              </span>
              <span className="text-[11px] text-slate-500 block truncate">
                {readinessData?.tenant?.name || "Configured"}
              </span>
            </div>
          </Link>

          {/* Step 2: Dining Tables */}
          <Link
            href="/admin/tables"
            className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/80 transition-all flex flex-col justify-between space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 2</span>
              {tables.length > 0 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block group-hover:text-blue-600">
                Restaurant Tables
              </span>
              <span className="text-[11px] text-slate-500 block">
                {tables.length > 0 ? `${tables.length} tables active` : "0 tables (Action required)"}
              </span>
            </div>
          </Link>

          {/* Step 3: Guestrooms */}
          <Link
            href="/admin/rooms"
            className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/80 transition-all flex flex-col justify-between space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 3</span>
              {rooms.length > 0 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-slate-300" />
              )}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block group-hover:text-blue-600">
                Hotel Rooms
              </span>
              <span className="text-[11px] text-slate-500 block">
                {rooms.length > 0 ? `${rooms.length} rooms active` : "0 rooms (Optional)"}
              </span>
            </div>
          </Link>

          {/* Step 4: Menu Catalog */}
          <Link
            href="/admin/menu"
            className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/80 transition-all flex flex-col justify-between space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 4</span>
              {menuItems.length > 0 ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block group-hover:text-blue-600">
                Menu &amp; Modifiers
              </span>
              <span className="text-[11px] text-slate-500 block">
                {menuItems.length > 0 ? `${menuItems.length} dishes configured` : "0 items (Action required)"}
              </span>
            </div>
          </Link>

          {/* Step 5: Staff & Access */}
          <Link
            href="/admin/users"
            className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/80 transition-all flex flex-col justify-between space-y-2 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Step 5</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 block group-hover:text-blue-600">
                Staff &amp; Access
              </span>
              <span className="text-[11px] text-slate-500 block">
                {metrics?.staffCount ? `${metrics.staffCount} staff active` : "Manage roster"}
              </span>
            </div>
          </Link>
        </div>
      </div>

      {/* Genuine Operational KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Sales */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Today&apos;s Gross Sales</span>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">
            <CurrencyDisplay amount={totalRevenue} />
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {orders.length > 0 ? `${orders.length} orders recorded` : "No orders placed yet today"}
          </span>
        </div>

        {/* Orders Dispatched */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Orders Dispatched</span>
            <UtensilsCrossed className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl sm:text-3xl font-black text-slate-900">
            {orders.length}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Live kitchen &amp; dining orders
          </span>
        </div>

        {/* Floor Occupancy */}
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

        {/* Physical Printing / Digital Mode Indicator */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Ticket / Invoice Mode</span>
            <Printer className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-base font-bold text-slate-900">Digital KDS &amp; Bills</p>
          <span className="text-[11px] text-slate-500 mt-1 block">
            V1 Pilot: Physical printers not required
          </span>
        </div>
      </div>

      {/* Quick Launch Operations Modules */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 mb-3 uppercase tracking-wider">
          Operations &amp; Configuration Modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/tables"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-400 hover:shadow-md transition-all group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 group-hover:scale-105 transition-transform">
              <Grid3X3 className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 mt-3 group-hover:text-blue-600 flex items-center justify-between text-sm">
              Dining Tables Fleet
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {tables.length} tables configured with QR ordering tokens.
            </p>
          </Link>

          <Link
            href="/admin/rooms"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-400 hover:shadow-md transition-all group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 group-hover:scale-105 transition-transform">
              <BedDouble className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 mt-3 group-hover:text-blue-600 flex items-center justify-between text-sm">
              Guestrooms &amp; Suites
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {rooms.length} rooms configured for in-room dining folios.
            </p>
          </Link>

          <Link
            href="/admin/menu"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-400 hover:shadow-md transition-all group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 group-hover:scale-105 transition-transform">
              <UtensilsCrossed className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 mt-3 group-hover:text-blue-600 flex items-center justify-between text-sm">
              Culinary Menu &amp; Categories
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {menuItems.length} dishes and portions published.
            </p>
          </Link>

          <Link
            href="/admin/users"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-400 hover:shadow-md transition-all group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 group-hover:scale-105 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 mt-3 group-hover:text-blue-600 flex items-center justify-between text-sm">
              Staff &amp; Role Permissions
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Granular access control, session revoking, and employee roles.
            </p>
          </Link>

          <Link
            href="/admin/settings"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-400 hover:shadow-md transition-all group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 group-hover:scale-105 transition-transform">
              <Settings className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 mt-3 group-hover:text-blue-600 flex items-center justify-between text-sm">
              Property &amp; Tax Rules
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Hotel name, GSTIN, CGST/SGST, and service charges.
            </p>
          </Link>

          <Link
            href="/admin/audit"
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-slate-400 hover:shadow-md transition-all group"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800 group-hover:scale-105 transition-transform">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 mt-3 group-hover:text-blue-600 flex items-center justify-between text-sm">
              Security Audit Trail
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Chained log of administrative changes and overrides.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}
