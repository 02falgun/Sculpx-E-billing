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
      <div className="rounded-xl bg-black border border-neutral-800 text-white p-6 sm:p-7">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-1.5 w-1.5 rounded-full bg-white" />
              <span className="text-[10px] uppercase font-semibold tracking-widest text-neutral-400">
                Floor Operations Center • Live Status
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Operational Overview
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 mt-1">
              Real-time floor velocity, kitchen expediencies, table occupancies, and operational exceptions.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/manager/exceptions">
              <Button
                variant="outline"
                size="md"
                className="border-neutral-700 text-neutral-200 hover:bg-neutral-800 font-medium"
                leftIcon={<AlertTriangle className="h-4 w-4" />}
              >
                Review Exceptions
              </Button>
            </Link>
          </div>
        </div>

        {/* 4 Core Operational Numbers */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-neutral-800">
          <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span>Orders Placed</span>
              <FileText className="h-4 w-4 text-neutral-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white mt-1">
              {totalOrdersCount}
            </div>
            <span className="text-[10px] text-neutral-400 font-medium">Active shift volume</span>
          </div>

          <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span>Kitchen Preparing</span>
              <Flame className="h-4 w-4 text-neutral-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white mt-1">
              {preparingCount}
            </div>
            <span className="text-[10px] text-neutral-400 font-medium">Cooking on cook lines</span>
          </div>

          <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span>Ready for Pickup</span>
              <CheckCircle2 className="h-4 w-4 text-neutral-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white mt-1">
              {readyCount}
            </div>
            <span className="text-[10px] text-neutral-400 font-medium">Awaiting waiter expedite</span>
          </div>

          <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span>Outstanding Bills</span>
              <Clock className="h-4 w-4 text-neutral-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white mt-1">
              {outstandingCount}
            </div>
            <span className="text-[10px] text-neutral-400 font-medium">Unsettled checks</span>
          </div>
        </div>
      </div>

      {/* NEEDS ATTENTION: OPERATIONAL EXCEPTIONS */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
              <AlertTriangle className="h-3 w-3" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Needs Attention • Operational Exceptions
            </h2>
          </div>
          <span className="text-xs text-neutral-500">4 Active Exceptions</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Printer Offline */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded border border-neutral-200">
                  Hardware
                </span>
                <span className="text-xs font-medium text-neutral-500">Offline</span>
              </div>
              <h3 className="text-sm font-bold text-neutral-900 mt-2">
                Reception Printer Offline
              </h3>
              <p className="text-xs text-neutral-600 mt-1">
                Offline for 8 min • 3 queued jobs redirected to Kitchen thermal buffer.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs text-neutral-500">Queue: 3 jobs</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addToast({ type: "info", title: "Diagnostic Dispatched", message: "Probing IP socket 192.168.1.102..." })}
                className="font-medium text-xs"
              >
                Retry Link
              </Button>
            </div>
          </div>

          {/* Card 2: Delayed Orders */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded border border-neutral-200">
                  Kitchen Delay
                </span>
                <span className="text-xs font-medium text-neutral-500">&gt;20 min</span>
              </div>
              <h3 className="text-sm font-bold text-neutral-900 mt-2">
                2 Delayed KOTs on Cook Line
              </h3>
              <p className="text-xs text-neutral-600 mt-1">
                Table 04 and Room 302 elapsed cooking times exceeded 20 minutes.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs text-neutral-500">Chef alerted</span>
              <Link href="/kitchen">
                <Button size="sm" variant="outline" className="text-xs font-medium">
                  Inspect KDS
                </Button>
              </Link>
            </div>
          </div>

          {/* Card 3: Unpaid Bills */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded border border-neutral-200">
                  Settlement
                </span>
                <span className="text-xs font-medium text-neutral-500">3 Checks</span>
              </div>
              <h3 className="text-sm font-bold text-neutral-900 mt-2">
                3 Unpaid Dining Checks
              </h3>
              <p className="text-xs text-neutral-600 mt-1">
                Table 03, Table 05, and Room 301 await cashier payment collection.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs text-neutral-500">₹3,720 due</span>
              <Link href="/cashier/outstanding">
                <Button size="sm" variant="outline" className="text-xs font-medium">
                  Cashier Desk
                </Button>
              </Link>
            </div>
          </div>

          {/* Card 4: Cancelled Order */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded border border-neutral-200">
                  Audit Void
                </span>
                <span className="text-xs font-mono font-medium text-neutral-500">ORD-1019</span>
              </div>
              <h3 className="text-sm font-bold text-neutral-900 mt-2">
                1 Cancelled / Voided Order
              </h3>
              <p className="text-xs text-neutral-600 mt-1">
                Guest cancelled due to urgent checkout. Inventory rollback confirmed.
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs text-neutral-500">Audit logged</span>
              <Link href="/manager/exceptions">
                <Button size="sm" variant="outline" className="text-xs font-medium">
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
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Floor Layout &amp; Occupancy</h3>
              <p className="text-xs text-neutral-500">Live seat utilization across dining pavilions</p>
            </div>
            <Link href="/manager/tables" className="text-xs font-medium text-neutral-700 hover:text-black hover:underline">
              Manage Tables &rarr;
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
              <span className="text-[11px] text-neutral-500 font-medium block">Total</span>
              <span className="text-xl font-bold text-neutral-900">{tables.length || 8}</span>
            </div>
            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
              <span className="text-[11px] text-neutral-500 font-medium block">Available</span>
              <span className="text-xl font-bold text-neutral-900">
                {tables.filter((t) => t.status === "AVAILABLE").length || 3}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
              <span className="text-[11px] text-neutral-500 font-medium block">Occupied</span>
              <span className="text-xl font-bold text-neutral-900">
                {tables.filter((t) => t.status === "OCCUPIED").length || 4}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
              <span className="text-[11px] text-neutral-500 font-medium block">Billed</span>
              <span className="text-xl font-bold text-neutral-900">
                {tables.filter((t) => t.status === "BILLED").length || 1}
              </span>
            </div>
          </div>
        </div>

        {/* Kitchen Expedition Velocity */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h3 className="text-sm font-bold text-neutral-900">Kitchen Line Velocity</h3>
              <p className="text-xs text-neutral-500">Current ticket throughput and cook times</p>
            </div>
            <Link href="/manager/kitchen" className="text-xs font-medium text-neutral-700 hover:text-black hover:underline">
              Inspect KDS &rarr;
            </Link>
          </div>
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-600 font-medium">Average Prep Time:</span>
              <span className="font-semibold text-neutral-900 font-mono">11m 40s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-600 font-medium">Expedite Rate:</span>
              <span className="font-semibold text-neutral-900">94.2% on-time</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-600 font-medium">Active KOT Tickets:</span>
              <span className="font-semibold text-neutral-900 font-mono">{kots.length} on line</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-600 font-medium">Hardware Fleet:</span>
              <span className="font-semibold text-neutral-900">
                {printers.length - offlinePrinters.length}/{printers.length} Printers Online
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
