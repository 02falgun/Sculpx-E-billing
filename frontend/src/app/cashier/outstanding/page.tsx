"use client";

import * as React from "react";
import Link from "next/link";
import { useAllBills } from "@/hooks/useBilling";
import { CurrencyDisplay, StatusBadge } from "@/components/shared";
import { Button } from "@/components/ui/Button";
import { AlertCircle, CreditCard, ArrowRight } from "lucide-react";

export default function CashierOutstandingPage() {
  const { data: billData } = useAllBills();
  const bills = billData?.data || [];
  const outstandingBills = bills.filter((b) => b.dueAmount > 0 || (b.status !== "PAID" && b.status !== "VOIDED"));

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Outstanding Due Bills
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Unsettled dining checks and room charges requiring cashier collection.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="pb-3">Bill #</th>
              <th className="pb-3">Context</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Total</th>
              <th className="pb-3">Balance Due</th>
              <th className="pb-3 text-right">Settlement</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {outstandingBills.map((bill) => (
              <tr key={bill.id} className="hover:bg-amber-50/50">
                <td className="py-3 font-mono font-bold text-slate-900">
                  #{bill.billNumber}
                </td>
                <td className="py-3 font-bold text-slate-900">{bill.qrContext.displayName}</td>
                <td className="py-3"><StatusBadge status={bill.status} /></td>
                <td className="py-3 font-medium"><CurrencyDisplay amount={bill.grandTotal} /></td>
                <td className="py-3 font-bold text-amber-600">
                  <CurrencyDisplay amount={bill.dueAmount} />
                </td>
                <td className="py-3 text-right">
                  <Link href={`/cashier/bills/${bill.id}`}>
                    <Button size="sm" variant="primary" className="bg-emerald-600 hover:bg-emerald-700 font-bold text-xs">
                      Collect Payment
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
