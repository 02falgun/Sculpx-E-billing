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
  const totalOrdersCount = orders.length;
  const preparingCount = kots.filter((k) => k.status === "PREPARING").length;
  const readyCount = kots.filter((k) => k.status === "READY").length;
  const outstandingBills = bills.filter((b) => b.dueAmount > 0);
  const outstandingCount = outstandingBills.length;

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

      {/* Real Dynamic Exceptions */}
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
          <span className="text-xs text-neutral-500">
            {offlinePrinters.length + (outstandingBills.length > 0 ? 1 : 0) + (kots.filter(k => k.status === "PREPARING").length > 0 ? 1 : 0)} Active Alerts
          </span>
        </div>

        {offlinePrinters.length === 0 && outstandingBills.length === 0 && kots.filter(k => k.status === "PREPARING").length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-8 text-center">
            <CheckCircle2 className="h-7 w-7 text-emerald-600 mx-auto mb-2" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Operations Clear • No Active Exceptions
            </h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
              All hardware devices, active kitchen lines, and guest checks are operating smoothly without bottlenecks.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {offlinePrinters.length > 0 && (
              <div className="rounded-lg border border-neutral-200 bg-white p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded border border-rose-200">
                      Hardware
                    </span>
                    <span className="text-xs font-medium text-rose-600">Offline</span>
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 mt-2">
                    {offlinePrinters.length} Printer{offlinePrinters.length > 1 ? "s" : ""} Offline
                  </h3>
                  <p className="text-xs text-neutral-600 mt-1">
                    {offlinePrinters.map((p) => p.name).join(", ")} not responding to network heartbeat.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-xs text-neutral-500">Fleet Alert</span>
                  <Link href="/admin/printers">
                    <Button size="sm" variant="outline" className="font-medium text-xs">
                      Inspect Fleet
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {kots.filter((k) => k.status === "PREPARING").length > 0 && (
              <div className="rounded-lg border border-neutral-200 bg-white p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                      Kitchen Line
                    </span>
                    <span className="text-xs font-medium text-amber-600">Active</span>
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 mt-2">
                    {kots.filter((k) => k.status === "PREPARING").length} Tickets On Cook Station
                  </h3>
                  <p className="text-xs text-neutral-600 mt-1">
                    KOT orders are currently being prepared on active kitchen stations.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-xs text-neutral-500">Cooking Line</span>
                  <Link href="/kitchen">
                    <Button size="sm" variant="outline" className="text-xs font-medium">
                      Inspect KDS
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {outstandingBills.length > 0 && (
              <div className="rounded-lg border border-neutral-200 bg-white p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                      Settlement
                    </span>
                    <span className="text-xs font-medium text-neutral-500">
                      {outstandingBills.length} Check{outstandingBills.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 mt-2">
                    {outstandingBills.length} Unsettled Dining Check{outstandingBills.length > 1 ? "s" : ""}
                  </h3>
                  <p className="text-xs text-neutral-600 mt-1">
                    Awaiting cashier payment collection.
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between">
                  <span className="text-xs text-neutral-500">
                    ₹{outstandingBills.reduce((acc, b) => acc + (b.dueAmount || 0), 0).toLocaleString("en-IN")} due
                  </span>
                  <Link href="/cashier/outstanding">
                    <Button size="sm" variant="outline" className="text-xs font-medium">
                      Cashier Desk
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
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
              <span className="text-xl font-bold text-neutral-900">{tables.length}</span>
            </div>
            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
              <span className="text-[11px] text-neutral-500 font-medium block">Available</span>
              <span className="text-xl font-bold text-neutral-900">
                {tables.filter((t) => t.status === "AVAILABLE").length}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
              <span className="text-[11px] text-neutral-500 font-medium block">Occupied</span>
              <span className="text-xl font-bold text-neutral-900">
                {tables.filter((t) => t.status === "OCCUPIED").length}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
              <span className="text-[11px] text-neutral-500 font-medium block">Billed</span>
              <span className="text-xl font-bold text-neutral-900">
                {tables.filter((t) => t.status === "BILLED").length}
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
            <Link href="/kitchen" className="text-xs font-medium text-neutral-700 hover:text-black hover:underline">
              Inspect KDS &rarr;
            </Link>
          </div>
          <div className="mt-4 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-neutral-600 font-medium">Active KOT Tickets:</span>
              <span className="font-semibold text-neutral-900 font-mono">{kots.length} on line</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-600 font-medium">Preparing Cook Line:</span>
              <span className="font-semibold text-neutral-900 font-mono">
                {kots.filter((k) => k.status === "PREPARING").length} tickets
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-600 font-medium">Ready For Service:</span>
              <span className="font-semibold text-neutral-900 font-mono">
                {kots.filter((k) => k.status === "READY").length} tickets
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-600 font-medium">Hardware Fleet:</span>
              <span className="font-semibold text-neutral-900">
                {printers.length > 0
                  ? `${printers.length - offlinePrinters.length}/${printers.length} Printers Online`
                  : "No printers configured"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
