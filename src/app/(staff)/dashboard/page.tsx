"use client";

import * as React from "react";
import Link from "next/link";
import { useTables } from "@/hooks/useTables";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/Button";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Grid3X3,
  ChefHat,
  Receipt,
  Users,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function StaffDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: tables = [] } = useTables();

  const total = tables.length;
  const occupied = tables.filter((t) => t.status === "OCCUPIED").length;
  const available = tables.filter((t) => t.status === "AVAILABLE").length;
  const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-3xl bg-slate-900 text-white p-6 sm:p-8 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
            Shift Operations Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
            Welcome back, {user?.name || "Floor Captain"}!
          </h1>
          <p className="text-xs text-slate-300 mt-1.5 max-w-xl">
            Monitor restaurant floor status, dispatch orders directly to the kitchen, and manage e-billing settlements.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/pos">
            <Button
              variant="primary"
              size="md"
              className="font-bold shadow-md shadow-amber-500/20"
              leftIcon={<UtensilsCrossed className="h-4 w-4" />}
            >
              Open POS
            </Button>
          </Link>
          <Link href="/tables">
            <Button
              variant="outline"
              size="md"
              className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 font-bold"
              leftIcon={<Grid3X3 className="h-4 w-4" />}
            >
              Floor Plan
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Floor Occupancy</span>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{occupancyRate}%</p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {occupied} of {total} tables seated
          </span>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs">
          <span className="text-xs font-semibold text-emerald-800">Tables Free</span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-700 mt-2">{available}</p>
          <span className="text-[11px] text-emerald-600 mt-1 block">
            Ready for walk-in seating
          </span>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-xs">
          <span className="text-xs font-semibold text-amber-800">Active Tables</span>
          <p className="text-2xl sm:text-3xl font-black text-amber-700 mt-2">{occupied}</p>
          <span className="text-[11px] text-amber-600 mt-1 block">
            Dining or waiting for bill
          </span>
        </div>

        <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-xs">
          <span className="text-xs font-semibold text-indigo-800">Active Station</span>
          <p className="text-xl font-black text-indigo-700 mt-2">Main Pavilion</p>
          <span className="text-[11px] text-indigo-600 mt-1 block">
            Grand Palace Hotel
          </span>
        </div>
      </div>

      {/* Quick Launchpad Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/pos"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-amber-400 hover:shadow-md transition-all group"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700 group-hover:scale-105 transition-transform">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-slate-900 mt-4 group-hover:text-amber-600 flex items-center justify-between">
            <span>Point of Sale (POS)</span>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Create staff orders, add food to running table tabs, and dispatch tickets.
          </p>
        </Link>

        <Link
          href="/tables"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-amber-400 hover:shadow-md transition-all group"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 group-hover:scale-105 transition-transform">
            <Grid3X3 className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-slate-900 mt-4 group-hover:text-amber-600 flex items-center justify-between">
            <span>Floor Tables & Layout</span>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Visual table map, live occupancy statuses, and floor captain actions.
          </p>
        </Link>

        <Link
          href="/kitchen"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:border-amber-400 hover:shadow-md transition-all group"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-100 text-rose-700 group-hover:scale-105 transition-transform">
            <ChefHat className="h-6 w-6" />
          </div>
          <h3 className="font-bold text-slate-900 mt-4 group-hover:text-amber-600 flex items-center justify-between">
            <span>Kitchen Display System</span>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Real-time digital ticket pass for kitchen line cooks and expedite chef.
          </p>
        </Link>
      </div>
    </div>
  );
}
