"use client";

import * as React from "react";
import Link from "next/link";
import { useOrders } from "@/hooks/useOrder";
import { useAllBills } from "@/hooks/useBilling";
import { BarChart3, TrendingUp, Users, DollarSign, Clock, ArrowLeft, Receipt } from "lucide-react";
import { CurrencyDisplay } from "@/components/shared";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";

export default function ManagerReportsPage() {
  const { data: ordersRes, isLoading: loadingOrders } = useOrders();
  const { data: billsRes, isLoading: loadingBills } = useAllBills();

  const orders = ordersRes?.data || [];
  const bills = billsRes?.data || [];

  if (loadingOrders || loadingBills) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <Spinner size="lg" className="text-purple-600" />
        <p className="text-xs font-semibold text-slate-500">Aggregating shift reports...</p>
      </div>
    );
  }

  const paidBills = bills.filter((b) => b.status === "PAID");
  const totalSettledRevenue = paidBills.reduce((acc, b) => acc + (b.paidAmount || b.grandTotal || 0), 0);
  const totalOutstanding = bills.filter((b) => b.dueAmount > 0).reduce((acc, b) => acc + (b.dueAmount || 0), 0);

  const avgTicketValue =
    paidBills.length > 0
      ? Math.round(totalSettledRevenue / paidBills.length)
      : orders.length > 0
      ? Math.round(orders.reduce((acc, o) => acc + (o.grandTotal || 0), 0) / orders.length)
      : 0;

  const completedOrders = orders.filter((o) => o.status === "COMPLETED" || o.status === "SERVED");

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <Link href="/manager">
            <button
              type="button"
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 mr-1"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <BarChart3 className="h-5 w-5 text-purple-600" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Shift Performance Reports
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Operational telemetry: total shift sales, settled ticket counts, average ticket value, and uncollected balances.
        </p>
      </div>

      {bills.length === 0 && orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-400 mx-auto border border-slate-200">
            <Receipt className="h-6 w-6" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            No Transactions Recorded Yet
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Live orders and settled guest bills will automatically aggregate into shift telemetry metrics here.
          </p>
          <div className="pt-2">
            <Link href="/manager">
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Return to Operations
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Settled Revenue</span>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              <CurrencyDisplay amount={totalSettledRevenue} />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {paidBills.length} settled {paidBills.length === 1 ? "invoice" : "invoices"}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Average Ticket Value</span>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              <CurrencyDisplay amount={avgTicketValue} />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Across active transactions</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Orders Handled</span>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              {orders.length}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {completedOrders.length} completed / served
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 text-xs">
              <span>Outstanding Balance</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 mt-2">
              <CurrencyDisplay amount={totalOutstanding} />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              {bills.filter((b) => b.dueAmount > 0).length} unsettled checks
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
