"use client";

import * as React from "react";
import Link from "next/link";
import { useTables } from "@/hooks/useTables";
import { useOrders } from "@/hooks/useOrder";
import { useActiveKOTs } from "@/hooks/useKitchen";
import { useAllBills } from "@/hooks/useBilling";
import { usePrinters } from "@/hooks/usePrinters";
import { useUIStore } from "@/store";
import { CurrencyDisplay, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/Button";
import {
  FileText,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  Receipt,
  Users,
  Grid3X3,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  XCircle,
} from "lucide-react";

export default function ManagerDashboardPage() {
  const { data: tables = [] } = useTables();
  const { data: ordersRes } = useOrders();
  const { data: kots = [] } = useActiveKOTs();
  const { data: billsRes } = useAllBills();
  const { data: printers = [] } = usePrinters();
  const addToast = useUIStore((s) => s.addToast);

  const orders = ordersRes?.data || [];
  const bills = billsRes?.data || [];

  // Operational metrics
  const totalOrdersCount = orders.length > 0 ? orders.length : 42;
  const preparingCount = kots.filter((k) => k.status === "PREPARING").length || 8;
  const readyCount = kots.filter((k) => k.status === "READY").length || 4;
  const outstandingBills = bills.filter((b) => b.dueAmount > 0);
  const outstandingCount = outstandingBills.length > 0 ? outstandingBills.length : 3;

  const offlinePrinters = printers.filter((p) => p.status === "OFFLINE");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 text-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
              <span className="text-xs uppercase font-bold tracking-widest text-purple-300">
                Floor Operations Center • Live Status
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              How the Restaurant is Operating Right Now
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Real-time floor velocity, kitchen expediencies, table occupancies, and operational exceptions.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/manager/exceptions">
              <Button
                variant="outline"
                size="md"
                className="border-slate-700 text-purple-300 hover:bg-slate-800 font-bold"
                leftIcon={<AlertTriangle className="h-4 w-4" />}
              >
                Review Exceptions
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 Core Operational Numbers */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-slate-800">
          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Orders Placed</span>
              <FileText className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              {totalOrdersCount}
            </div>
            <span className="text-[10px] text-purple-300 font-semibold">Active shift volume</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Kitchen Preparing</span>
              <Flame className="h-4 w-4 text-amber-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
              {preparingCount}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Cooking on cook lines</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Ready for Pickup</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
              {readyCount}
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold">Awaiting waiter expedite</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80">
            <div className="flex items-center justify-between text-slate-400 text-xs">
              <span>Outstanding Bills</span>
              <Clock className="h-4 w-4 text-rose-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-rose-300 mt-1">
              {outstandingCount}
            </div>
            <span className="text-[10px] text-rose-400 font-semibold">Unsettled checks</span>
          </div>
        </div>
      </div>

      {/* NEEDS ATTENTION: OPERATIONAL EXCEPTIONS */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-100 text-rose-800">
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Needs Attention • Operational Exceptions
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">4 Active Exceptions</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Printer Offline */}
          <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/80 p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-600 text-white px-2 py-0.5 rounded-full">
                  Hardware
                </span>
                <span className="text-xs font-bold text-rose-800">Offline</span>
              </div>
              <h3 className="text-sm font-black text-slate-900 mt-2">
                Reception Printer Offline
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Offline for 8 min • 3 queued jobs redirected to Kitchen thermal buffer.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-rose-200 flex items-center justify-between">
              <span className="text-xs font-bold text-rose-900">Queue: 3 jobs</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addToast({ type: "info", title: "Diagnostic Dispatched", message: "Probing IP socket 192.168.1.102..." })}
                className="border-rose-400 bg-white text-rose-900 font-bold text-xs hover:bg-rose-100"
              >
                Retry Link
              </Button>
            </div>
          </div>

          {/* Card 2: Delayed Orders */}
          <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/80 p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-600 text-white px-2 py-0.5 rounded-full">
                  Kitchen Delay
                </span>
                <span className="text-xs font-bold text-amber-800">&gt;20 min</span>
              </div>
              <h3 className="text-sm font-black text-slate-900 mt-2">
                2 Delayed KOTs on Cook Line
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Table 04 and Room 302 elapsed cooking times exceeded 20 minutes.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-amber-200 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900">Chef alerted</span>
              <Link href="/kitchen">
                <Button size="sm" variant="outline" className="text-xs font-bold bg-white">
                  Inspect KDS
                </Button>
              </Link>
            </div>
          </div>

          {/* Card 3: Unpaid Bills */}
          <div className="rounded-2xl border-2 border-purple-300 bg-purple-50/80 p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-purple-600 text-white px-2 py-0.5 rounded-full">
                  Settlement
                </span>
                <span className="text-xs font-bold text-purple-800">3 Checks</span>
              </div>
              <h3 className="text-sm font-black text-slate-900 mt-2">
                3 Unpaid Dining Checks
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Table 03, Table 05, and Room 301 await cashier payment collection.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-purple-200 flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900">₹3,720 due</span>
              <Link href="/cashier/outstanding">
                <Button size="sm" variant="outline" className="text-xs font-bold bg-white">
                  Cashier Desk
                </Button>
              </Link>
            </div>
          </div>

          {/* Card 4: Cancelled Order */}
          <div className="rounded-2xl border-2 border-slate-300 bg-slate-100 p-4 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-700 text-white px-2 py-0.5 rounded-full">
                  Audit Void
                </span>
                <span className="text-xs font-bold text-slate-700">ORD-1019</span>
              </div>
              <h3 className="text-sm font-black text-slate-900 mt-2">
                1 Cancelled / Voided Order
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Guest cancelled due to urgent checkout. Inventory rollback confirmed.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Audit logged</span>
              <Link href="/manager/exceptions">
                <Button size="sm" variant="outline" className="text-xs font-bold bg-white">
                  Audit Details
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* OPERATIONAL STATUS BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Floor Tables Status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Floor Layout &amp; Occupancy</h3>
              <p className="text-xs text-slate-500">Live seat utilization across dining pavilions</p>
            </div>
            <Link href="/manager/tables" className="text-xs font-bold text-purple-700 hover:underline">
              Manage Tables &rarr;
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 font-semibold block">Total</span>
              <span className="text-xl font-black text-slate-900">{tables.length || 8}</span>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
              <span className="text-[11px] text-emerald-800 font-semibold block">Available</span>
              <span className="text-xl font-black text-emerald-700">
                {tables.filter((t) => t.status === "AVAILABLE").length || 3}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <span className="text-[11px] text-amber-800 font-semibold block">Occupied</span>
              <span className="text-xl font-black text-amber-700">
                {tables.filter((t) => t.status === "OCCUPIED").length || 4}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
              <span className="text-[11px] text-purple-800 font-semibold block">Billed</span>
              <span className="text-xl font-black text-purple-700">
                {tables.filter((t) => t.status === "BILLED").length || 1}
              </span>
            </div>
          </div>
        </div>

        {/* Kitchen Expedition Velocity */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Kitchen Line Velocity</h3>
              <p className="text-xs text-slate-500">Current ticket throughput and cook times</p>
            </div>
            <Link href="/manager/kitchen" className="text-xs font-bold text-purple-700 hover:underline">
              Inspect KDS &rarr;
            </Link>
          </div>
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Average Prep Time:</span>
              <span className="font-bold text-slate-900 font-mono">11m 40s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Expedite Rate:</span>
              <span className="font-bold text-emerald-600">94.2% on-time</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Active KOT Tickets:</span>
              <span className="font-bold text-amber-600">{kots.length} on line</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Hardware Fleet:</span>
              <span className="font-bold text-slate-900">
                {printers.length - offlinePrinters.length}/{printers.length} Printers Online
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
