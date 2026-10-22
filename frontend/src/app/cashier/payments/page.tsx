"use client";

import * as React from "react";
import Link from "next/link";
import { useAllBills } from "@/hooks/useBilling";
import { CurrencyDisplay } from "@/components/shared";
import { Button } from "@/components/ui/Button";
import { CreditCard, CheckCircle2, RefreshCw, Printer, ArrowLeft } from "lucide-react";

export default function CashierPaymentsPage() {
  const { data: billData } = useAllBills();
  const bills = billData?.data || [];
  const paidBills = bills.filter((b) => b.status === "PAID" || b.paidAmount > 0);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-emerald-600" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Settled Transactions
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Complete ledger of collected digital payments, UPI transfers, and card authorizations.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="pb-3">Transaction ID</th>
              <th className="pb-3">Bill #</th>
              <th className="pb-3">Context</th>
              <th className="pb-3">Method</th>
              <th className="pb-3">Settled Amount</th>
              <th className="pb-3">Timestamp</th>
              <th className="pb-3 text-right">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {paidBills.map((bill, idx) => (
              <tr key={bill.id} className="hover:bg-slate-50">
                <td className="py-3 font-mono font-bold text-slate-900">
                  TXN-2026-00{idx + 104}
                </td>
                <td className="py-3 font-semibold text-emerald-700">
                  <Link href={`/cashier/bills/${bill.id}`}>#{bill.billNumber}</Link>
                </td>
                <td className="py-3 font-semibold text-slate-900">{bill.qrContext.displayName}</td>
                <td className="py-3">
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-3 w-3" /> UPI / Card
                  </span>
                </td>
                <td className="py-3 font-bold text-slate-900">
                  <CurrencyDisplay amount={bill.paidAmount > 0 ? bill.paidAmount : bill.grandTotal} />
                </td>
                <td className="py-3 text-slate-400 text-[11px]">
                  {new Date(bill.updatedAt).toLocaleTimeString()}
                </td>
                <td className="py-3 text-right">
                  <Link href={`/cashier/bills/${bill.id}`}>
                    <Button size="sm" variant="outline" className="text-xs">
                      View
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
