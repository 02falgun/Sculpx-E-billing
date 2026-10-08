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
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 text-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            Shift Operations Portal
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-1 text-white">
            Welcome back, {user?.name || "Floor Captain"}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Monitor restaurant floor status, dispatch orders directly to the kitchen, and manage e-billing settlements.
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/pos">
            <Button
              variant="primary"
              size="md"
              className="font-semibold shadow-xs"
              leftIcon={<UtensilsCrossed className="h-4 w-4" />}
            >
              Open POS
            </Button>
          </Link>
          <Link href="/tables">
            <Button
              variant="outline"
              size="md"
              className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 hover:text-white font-semibold"
              leftIcon={<Grid3X3 className="h-4 w-4" />}
            >
              Floor Plan
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Floor Occupancy</span>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{occupancyRate}%</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block tabular-nums">
            {occupied} of {total} tables seated
          </span>
        </div>

        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-4.5 shadow-xs">
          <span className="text-xs font-medium text-emerald-800">Tables Free</span>
          <p className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">{available}</p>
          <span className="text-[11px] text-emerald-600 mt-0.5 block">
            Ready for walk-in seating
          </span>
        </div>

        <div className="rounded-xl border border-amber-200/80 bg-amber-50/30 p-4.5 shadow-xs">
          <span className="text-xs font-medium text-amber-800">Active Tables</span>
          <p className="text-2xl font-bold text-amber-700 mt-1 tabular-nums">{occupied}</p>
          <span className="text-[11px] text-amber-600 mt-0.5 block">
            Dining or awaiting bill
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Active Station</span>
          <p className="text-lg font-bold text-slate-900 mt-1">Main Pavilion</p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Grand Palace Hotel
          </span>
        </div>
      </div>

      {/* Quick Launchpad Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/pos"
          className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-slate-300 hover:shadow-xs transition-colors group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-slate-900 mt-3 group-hover:text-amber-800 flex items-center justify-between text-sm">
            <span>Point of Sale (POS)</span>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-800 transition-colors" />
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Create staff orders, add food to running table tabs, and dispatch tickets.
          </p>
        </Link>

        <Link
          href="/tables"
          className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-slate-300 hover:shadow-xs transition-colors group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 border border-slate-200/60">
            <Grid3X3 className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-slate-900 mt-3 group-hover:text-amber-800 flex items-center justify-between text-sm">
            <span>Floor Tables & Layout</span>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-800 transition-colors" />
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Visual table map, live occupancy statuses, and floor captain actions.
          </p>
        </Link>

        <Link
          href="/kitchen"
          className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs hover:border-slate-300 hover:shadow-xs transition-colors group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50 text-rose-700 border border-rose-200/60">
            <ChefHat className="h-5 w-5" />
          </div>
          <h3 className="font-semibold text-slate-900 mt-3 group-hover:text-amber-800 flex items-center justify-between text-sm">
            <span>Kitchen Display System</span>
            <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-amber-800 transition-colors" />
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            Real-time digital ticket pass for kitchen line cooks and expedite chef.
          </p>
        </Link>
      </div>
    </div>
  );
}
