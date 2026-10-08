"use client";

import * as React from "react";
import Link from "next/link";
import { Bill } from "@/types";
import { useAllBills } from "@/hooks/useBilling";
import { useBillingUpdates } from "@/hooks/useWebSocket";
import { StatusBadge, QRContextBadge, CurrencyDisplay } from "@/components/shared";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useUIStore } from "@/store";
import {
  Receipt,
  Printer,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Coins,
} from "lucide-react";

export function BillingDeskTable() {
  const [filterMode, setFilterMode] = React.useState<"ALL" | "UNSETTLED" | "PAID">("UNSETTLED");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const { data: billData, isLoading, refetch } = useAllBills();
  useBillingUpdates();

  const addToast = useUIStore((s) => s.addToast);
  const bills = billData?.data || [];

  // Filtered bills
  const filteredBills = React.useMemo(() => {
    return bills.filter((bill) => {
      // Filter mode
      if (filterMode === "UNSETTLED" && bill.dueAmount <= 0) return false;
      if (filterMode === "PAID" && bill.status !== "PAID" && bill.dueAmount > 0) return false;

      // Search query
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        bill.billNumber.toLowerCase().includes(query) ||
        bill.orderNumber.toLowerCase().includes(query) ||
        bill.qrContext.displayName.toLowerCase().includes(query)
      );
    });
  }, [bills, filterMode, searchQuery]);

  // Overall Financial KPIs
  const stats = React.useMemo(() => {
    const totalCount = bills.length;
    const unsettledBills = bills.filter((b) => b.dueAmount > 0);
    const totalDue = unsettledBills.reduce((acc, b) => acc + b.dueAmount, 0);
    const totalCollected = bills.reduce((acc, b) => acc + b.paidAmount, 0);
    const settledCount = bills.filter((b) => b.status === "PAID" || b.dueAmount === 0).length;

    return { totalCount, unsettledCount: unsettledBills.length, totalDue, totalCollected, settledCount };
  }, [bills]);

  const handlePrintThermal = (bill: Bill) => {
    addToast({
      type: "success",
      title: "KOT / Invoice Dispatched to Printer",
      message: `Thermal receipt #${bill.billNumber} queued on billing counter printer!`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-800">
            <span>Outstanding / Due Balance</span>
            <AlertCircle className="h-4 w-4 text-rose-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-700">
            <CurrencyDisplay amount={stats.totalDue} />
          </div>
          <span className="text-[11px] text-rose-600 font-medium mt-1 block">
            {stats.unsettledCount} unsettled dining tabs
          </span>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-800">
            <span>Collected Today</span>
            <Coins className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-700">
            <CurrencyDisplay amount={stats.totalCollected} />
          </div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">
            {stats.settledCount} settled transactions
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Total Bills Issued</span>
            <Receipt className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{stats.totalCount}</p>
          <span className="text-[11px] text-slate-400 mt-1 block">Shift sales records</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterMode("UNSETTLED")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterMode === "UNSETTLED"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>Unsettled Tabs ({stats.unsettledCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode("PAID")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterMode === "PAID"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>Paid & Settled ({stats.settledCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode("ALL")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              filterMode === "ALL"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>All Invoices ({stats.totalCount})</span>
          </button>
        </div>

        <div className="w-full sm:w-64">
          <SearchInput
            placeholder="Search invoice #, table..."
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
          />
        </div>
      </div>

      {/* Invoices List Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
          <Spinner size="lg" className="text-amber-500" />
          <p className="text-xs font-semibold text-slate-500">Loading billing ledger...</p>
        </div>
      ) : filteredBills.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 pl-4 pr-3">Invoice Number</th>
                <th className="py-3.5 px-3">Dining Context</th>
                <th className="py-3.5 px-3">Order #</th>
                <th className="py-3.5 px-3">Bill Status</th>
                <th className="py-3.5 px-3">Total Amount</th>
                <th className="py-3.5 px-3">Balance Due</th>
                <th className="py-3.5 pr-4 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBills.map((bill) => {
                const hasDue = bill.dueAmount > 0;
                return (
                  <tr key={bill.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 pl-4 pr-3 font-bold text-slate-900">
                      #{bill.billNumber}
                    </td>

                    <td className="py-3.5 px-3">
                      <QRContextBadge context={bill.qrContext} />
                    </td>

                    <td className="py-3.5 px-3 font-medium text-slate-700">
                      #{bill.orderNumber}
                    </td>

                    <td className="py-3.5 px-3">
                      <StatusBadge status={bill.status} type="bill" />
                    </td>

                    <td className="py-3.5 px-3 font-bold text-slate-900">
                      <CurrencyDisplay amount={bill.grandTotal} />
                    </td>

                    <td className="py-3.5 px-3 font-black">
                      <CurrencyDisplay
                        amount={bill.dueAmount}
                        className={hasDue ? "text-rose-600" : "text-emerald-600"}
                      />
                    </td>

                    <td className="py-3.5 pr-4 pl-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrintThermal(bill)}
                          title="Print Thermal Receipt"
                          className="px-2"
                        >
                          <Printer className="h-3.5 w-3.5 text-slate-600" />
                        </Button>

                        <Link href={`/bill/${bill.id}`}>
                          <Button
                            variant={hasDue ? "primary" : "outline"}
                            size="sm"
                            className="font-bold text-xs"
                          >
                            {hasDue ? "Settle Tab" : "View E-Bill"}
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No Bills Found"
          description="There are no billing records matching the current criteria."
          actionLabel="Show All Invoices"
          onAction={() => {
            setFilterMode("ALL");
            setSearchQuery("");
          }}
        />
      )}
    </div>
  );
}
