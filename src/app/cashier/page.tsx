"use client";

import * as React from "react";
import Link from "next/link";
import { useAllBills } from "@/hooks/useBilling";
import { useUIStore } from "@/store";
import { CurrencyDisplay, StatusBadge, QRContextBadge } from "@/components/shared";
import { Button } from "@/components/ui/Button";
import { PaymentModal } from "@/features/billing";
import { Bill } from "@/types";
import {
  IndianRupee,
  Receipt,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  ArrowRight,
  TrendingUp,
  Banknote,
  RefreshCw,
} from "lucide-react";

export default function CashierDashboardPage() {
  const { data: billData, isLoading, refetch } = useAllBills();
  const bills = billData?.data || [];
  const addToast = useUIStore((s) => s.addToast);

  const [selectedBillForPayment, setSelectedBillForPayment] = React.useState<Bill | null>(null);

  // Financial aggregates
  const paidBills = bills.filter((b) => b.status === "PAID");
  const outstandingBills = bills.filter((b) => b.dueAmount > 0 || (b.status !== "PAID" && b.status !== "VOIDED"));
  const voidedBills = bills.filter((b) => b.status === "VOIDED");
  const totalRevenue = paidBills.reduce((acc, b) => acc + b.grandTotal, 0);
  const totalOutstanding = outstandingBills.reduce((acc, b) => acc + b.dueAmount, 0);

  const handlePrintReceipt = (billNumber: string) => {
    addToast({
      type: "info",
      title: "Invoice Selected",
      message: `Bill #${billNumber} opened for receipt preview.`,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Financial Overview Banner */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 text-white p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs uppercase font-bold tracking-widest text-emerald-400">
                Cashier Settlement Terminal • Live Desk
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Today&apos;s Billing &amp; Collections
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Live settlement desk for table dining receipts, in-room folios, and GST tax invoices.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/cashier/bills">
              <Button
                variant="primary"
                size="md"
                className="bg-white text-black hover:bg-neutral-200 font-semibold"
                leftIcon={<Receipt className="h-4 w-4" />}
              >
                All Invoices ({bills.length})
              </Button>
            </Link>
          </div>
        </div>

        {/* Financial KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-neutral-800">
          <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span>Today&apos;s Revenue</span>
              <TrendingUp className="h-4 w-4 text-neutral-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1">
              <CurrencyDisplay amount={totalRevenue} />
            </div>
            <span className="text-[10px] text-neutral-400 font-medium">
              {paidBills.length > 0 ? `${paidBills.length} settled checks` : "No settled revenue yet"}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span>Settled Bills</span>
              <CheckCircle2 className="h-4 w-4 text-neutral-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {paidBills.length} Paid
            </div>
            <span className="text-[10px] text-neutral-400 font-medium">Digital UPI, Cards &amp; Cash</span>
          </div>

          <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span>Outstanding Due</span>
              <Clock className="h-4 w-4 text-neutral-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1">
              <CurrencyDisplay amount={totalOutstanding} />
            </div>
            <span className="text-[10px] text-neutral-400 font-medium">
              {outstandingBills.length} unpaid bill{outstandingBills.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800">
            <div className="flex items-center justify-between text-neutral-400 text-xs">
              <span>Exceptions &amp; Voids</span>
              <RefreshCw className="h-4 w-4 text-neutral-400" />
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {voidedBills.length} Voided
            </div>
            <span className="text-[10px] text-neutral-400 font-medium">
              {voidedBills.length > 0 ? "Audited cancellations" : "Zero exceptions pending"}
            </span>
          </div>
        </div>
      </div>

      {/* NEEDS ATTENTION: FINANCIAL ACTION ITEMS */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
              <AlertTriangle className="h-3 w-3" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Needs Attention • Cashier Alerts
            </h2>
          </div>
          <span className="text-xs text-neutral-500">
            {outstandingBills.length} Unsettled • {voidedBills.length} Voided
          </span>
        </div>

        {outstandingBills.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-xs text-neutral-500">
            <CheckCircle2 className="h-6 w-6 text-emerald-600 mx-auto mb-2" />
            <p className="font-semibold text-neutral-800">All dining checks settled</p>
            <p className="mt-0.5">No outstanding guest balances or cashier exceptions requiring action.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {outstandingBills.slice(0, 3).map((bill) => (
              <div
                key={bill.id}
                className="rounded-lg border border-neutral-200 bg-white p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                      Unsettled Bill
                    </span>
                    <span className="text-xs font-mono font-medium text-neutral-600">
                      {bill.qrContext.displayName}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-neutral-900 mt-2">
                    Bill #{bill.billNumber} • <CurrencyDisplay amount={bill.dueAmount} />
                  </h3>
                  <p className="text-xs text-neutral-600 mt-1">
                    Order #{bill.orderNumber}. Awaiting cashier payment collection.
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
                  <Link
                    href={`/cashier/bills/${bill.id}`}
                    className="text-xs font-medium text-neutral-600 hover:text-black hover:underline"
                  >
                    View Bill
                  </Link>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setSelectedBillForPayment(bill)}
                    className="font-medium text-xs"
                    leftIcon={<CreditCard className="h-3.5 w-3.5" />}
                  >
                    Collect Payment
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* OUTSTANDING BILLS LIST */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Customer Invoices</h3>
            <p className="text-xs text-slate-500">Live feed of table and room orders awaiting cashier settlement</p>
          </div>
          <Link
            href="/cashier/bills"
            className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
          >
            <span>View All Invoices</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {bills.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            <Receipt className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No customer invoices available</p>
            <p className="text-slate-400 mt-1">Invoices generated for dining tables and guestrooms will appear in this ledger.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-3">Bill #</th>
                  <th className="pb-3">Location</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Grand Total</th>
                  <th className="pb-3">Due</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {bills.slice(0, 5).map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-mono font-bold text-slate-900">
                      <Link href={`/cashier/bills/${bill.id}`} className="hover:underline text-emerald-700">
                        #{bill.billNumber}
                      </Link>
                    </td>
                    <td className="py-3">
                      <span className="font-semibold text-slate-900">{bill.qrContext.displayName}</span>
                    </td>
                    <td className="py-3">
                      <StatusBadge status={bill.status} />
                    </td>
                    <td className="py-3 font-bold text-slate-900">
                      <CurrencyDisplay amount={bill.grandTotal} />
                    </td>
                    <td className="py-3 font-bold">
                      {bill.dueAmount > 0 ? (
                        <span className="text-amber-600 font-bold">
                          <CurrencyDisplay amount={bill.dueAmount} />
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-bold">Paid</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePrintReceipt(bill.billNumber)}
                          className="text-xs px-2"
                          title="Print Thermal Receipt"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                        <Link href={`/cashier/bills/${bill.id}`}>
                          <Button size="sm" variant="outline" className="text-xs">
                            Details
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedBillForPayment && (
        <PaymentModal
          bill={selectedBillForPayment}
          tipAmount={0}
          isOpen={true}
          onClose={() => setSelectedBillForPayment(null)}
          onSuccess={() => {
            setSelectedBillForPayment(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}
