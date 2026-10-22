"use client";

import * as React from "react";
import Link from "next/link";
import { useTables } from "@/hooks/useTables";
import { useOrders } from "@/hooks/useOrder";
import { useActiveKOTs } from "@/hooks/useKitchen";
import { useAllBills } from "@/hooks/useBilling";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/Button";
import { StatusBadge, QRContextBadge, CurrencyDisplay } from "@/components/shared";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Grid3X3,
  ChefHat,
  Receipt,
  Users,
  Clock,
  ArrowRight,
  AlertTriangle,
  Flame,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

export default function StaffDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: tables = [] } = useTables();
  const { data: orderData } = useOrders();
  const { data: kots = [] } = useActiveKOTs();
  const { data: billData } = useAllBills();

  const orders = orderData?.data || [];
  const bills = billData?.data || [];

  // Key Operational Counts
  const activeOrders = orders.filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELLED");
  const preparingOrders = activeOrders.filter((o) => o.status === "PREPARING");
  const readyOrders = activeOrders.filter((o) => o.status === "READY");
  const pendingBills = bills.filter((b) => b.dueAmount > 0);

  // Floor occupancy
  const totalTables = tables.length;
  const occupiedTables = tables.filter((t) => t.status === "OCCUPIED").length;
  const occupancyRate = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

  // Action required: tickets older than 20 minutes
  const overdueOrders = activeOrders.filter((o) => {
    const elapsedMinutes = (Date.now() - new Date(o.createdAt).getTime()) / (1000 * 60);
    return elapsedMinutes > 20 && (o.status === "PLACED" || o.status === "CONFIRMED" || o.status === "PREPARING");
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Shift Welcome & Quick Actions */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 text-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
            Operations Center • Shift Active
          </span>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight mt-0.5 text-white">
            Good day, {user?.name || "Floor Captain"}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Live restaurant floor, kitchen expedite dispatch, and cashier ledger for The Grand Royal Palace.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href="/pos">
            <Button
              variant="primary"
              size="md"
              className="font-semibold shadow-xs"
              leftIcon={<UtensilsCrossed className="h-4 w-4" />}
            >
              New Order (POS)
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

      {/* Action Required Alert Section */}
      {overdueOrders.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 shadow-xs">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-rose-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-rose-900">
              Action Required — {overdueOrders.length} Order{overdueOrders.length > 1 ? "s" : ""} Waiting &gt; 20 Mins
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {overdueOrders.map((order) => (
              <Link
                key={order.id}
                href={`/order/${order.id}`}
                className="rounded-lg border border-rose-200/90 bg-white p-3 hover:border-rose-300 transition-colors shadow-2xs flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">#{order.orderNumber}</span>
                    <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded">
                      {order.qrContext.displayName}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Status: <strong className="text-slate-700">{order.status}</strong>
                  </span>
                </div>
                <ArrowRight className="h-4 w-4 text-rose-500" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Operational Overview KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Active Orders</span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {activeOrders.length}
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Live dining sessions
          </span>
        </div>

        <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-800 text-xs font-medium">
            <span>Cooking Now</span>
            <Flame className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-700 mt-1 tabular-nums">
            {preparingOrders.length}
          </p>
          <span className="text-[11px] text-amber-700 mt-0.5 block">
            {kots.length} tickets on kitchen line
          </span>
        </div>

        <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-800 text-xs font-medium">
            <span>Food Ready</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
            {readyOrders.length}
          </p>
          <span className="text-[11px] text-emerald-700 mt-0.5 block">
            Ready for table delivery
          </span>
        </div>

        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Floor Seating</span>
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {occupancyRate}%
          </p>
          <span className="text-[11px] text-slate-400 mt-0.5 block tabular-nums">
            {occupiedTables} of {totalTables} tables seated
          </span>
        </div>
      </div>

      {/* Live Active Orders Stream */}
      <div className="rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Live Active Orders</h2>
            <p className="text-xs text-slate-500">Real-time status of orders placed across floor tables and guest rooms</p>
          </div>

          <Link href="/orders" className="text-xs font-semibold text-amber-800 hover:text-amber-900 flex items-center gap-1">
            <span>View All ({orders.length})</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {activeOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5">Order</th>
                  <th className="pb-2.5">Location</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5">Items</th>
                  <th className="pb-2.5 text-right">Total</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeOrders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 font-bold text-slate-900">
                      #{order.orderNumber}
                    </td>
                    <td className="py-3">
                      <QRContextBadge context={order.qrContext} />
                    </td>
                    <td className="py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="py-3 text-slate-600">
                      {order.items.reduce((acc, i) => acc + i.quantity, 0)} items
                    </td>
                    <td className="py-3 text-right font-semibold text-slate-900">
                      <CurrencyDisplay amount={order.grandTotal} />
                    </td>
                    <td className="py-3 text-right">
                      <Link href={`/order/${order.id}`}>
                        <Button variant="outline" size="sm" className="text-xs font-semibold">
                          View Status
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-400">
            No orders currently waiting in kitchen or floor queues.
          </div>
        )}
      </div>

      {/* Operational Launchpad Modules */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          href="/pos"
          className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-xs hover:border-slate-300 hover:shadow-xs transition-colors group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60">
            <UtensilsCrossed className="h-4.5 w-4.5" />
          </div>
          <h3 className="font-semibold text-slate-900 mt-2.5 group-hover:text-amber-800 flex items-center justify-between text-xs">
            <span>POS Terminal</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-800 transition-colors" />
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            Quick order punch &amp; add to table tab.
          </p>
        </Link>

        <Link
          href="/tables"
          className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-xs hover:border-slate-300 hover:shadow-xs transition-colors group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 border border-slate-200/60">
            <Grid3X3 className="h-4.5 w-4.5" />
          </div>
          <h3 className="font-semibold text-slate-900 mt-2.5 group-hover:text-amber-800 flex items-center justify-between text-xs">
            <span>Floor Plan</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-800 transition-colors" />
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            Table occupancy map &amp; seating status.
          </p>
        </Link>

        <Link
          href="/kitchen"
          className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-xs hover:border-slate-300 hover:shadow-xs transition-colors group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rose-50 text-rose-700 border border-rose-200/60">
            <ChefHat className="h-4.5 w-4.5" />
          </div>
          <h3 className="font-semibold text-slate-900 mt-2.5 group-hover:text-amber-800 flex items-center justify-between text-xs">
            <span>Kitchen KDS</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-800 transition-colors" />
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            Live cooking timers &amp; food pass.
          </p>
        </Link>

        <Link
          href="/billing"
          className="rounded-xl border border-slate-200/90 bg-white p-4.5 shadow-xs hover:border-slate-300 hover:shadow-xs transition-colors group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            <Receipt className="h-4.5 w-4.5" />
          </div>
          <h3 className="font-semibold text-slate-900 mt-2.5 group-hover:text-amber-800 flex items-center justify-between text-xs">
            <span>Billing Desk</span>
            <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-amber-800 transition-colors" />
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
            {pendingBills.length} unsettled dining tabs.
          </p>
        </Link>
      </div>
    </div>
  );
}
