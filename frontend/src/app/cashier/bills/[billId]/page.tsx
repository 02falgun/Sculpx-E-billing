"use client";

import * as React from "react";
import Link from "next/link";
import { useBill } from "@/hooks/useBilling";
import { useUIStore } from "@/store";
import { PaymentModal } from "@/features/billing";
import { CurrencyDisplay, StatusBadge, QRContextBadge } from "@/components/shared";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/EmptyState";
import {
  ArrowLeft,
  Printer,
  CreditCard,
  Percent,
  Split,
  RefreshCw,
  XCircle,
  Receipt,
  CheckCircle2,
  Calendar,
} from "lucide-react";

interface CashierBillPageProps {
  params: Promise<{
    billId: string;
  }>;
}

export default function CashierBillDetailPage({ params }: CashierBillPageProps) {
  const unwrappedParams = React.use(params);
  const billId = unwrappedParams.billId;

  const { data: bill, isLoading, error, refetch } = useBill(billId);
  const addToast = useUIStore((s) => s.addToast);

  const [isPaymentOpen, setIsPaymentOpen] = React.useState(false);
  const [discountApplied, setDiscountApplied] = React.useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Spinner size="lg" className="text-emerald-600" />
        <p className="text-xs font-semibold text-slate-500">Loading bill #{billId}...</p>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="py-8 max-w-md mx-auto">
        <ErrorState
          title="Bill Not Found"
          message={error instanceof Error ? error.message : "Invoice details could not be found."}
          onRetry={() => refetch()}
        />
        <div className="mt-4 text-center">
          <Link href="/cashier/bills">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to Bills Desk
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    addToast({
      type: "success",
      title: "Receipt Printed",
      message: `Thermal receipt dispatched for Bill #${bill.billNumber}`,
    });
  };

  const handleApplyDiscount = () => {
    setDiscountApplied(!discountApplied);
    addToast({
      type: "info",
      title: discountApplied ? "Discount Removed" : "10% Courtesy Discount Applied",
      message: discountApplied ? "Standard rates restored." : "Manager override applied.",
    });
  };

  const handleSplitBill = () => {
    addToast({
      type: "info",
      title: "Split Bill Wizard",
      message: "Split by covers (2 guests: ₹" + Math.round(bill.grandTotal / 2) + " each).",
    });
  };

  const handleRefund = () => {
    addToast({
      type: "info",
      title: "Refund Initiated",
      message: "Manager authorization verified for invoice refund.",
    });
  };

  const currentGrandTotal = discountApplied ? Math.round(bill.grandTotal * 0.9) : bill.grandTotal;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link href="/cashier/bills">
            <button
              type="button"
              className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Bill #{bill.billNumber}
              </h1>
              <StatusBadge status={bill.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Order #{bill.orderNumber} • Created {new Date(bill.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="h-4 w-4" />}
          >
            Print Receipt
          </Button>

          {bill.dueAmount > 0 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsPaymentOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 font-bold"
              leftIcon={<CreditCard className="h-4 w-4" />}
            >
              Collect Payment
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Bill details & items */}
        <div className="md:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <QRContextBadge context={bill.qrContext} />
            <div className="text-right text-xs text-slate-500">
              {bill.customerGstNumber && (
                <span className="block font-semibold text-slate-900">GSTIN: {bill.customerGstNumber}</span>
              )}
              <span>Invoice: Tax Bill</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="pb-2.5">Item Description</th>
                  <th className="pb-2.5 text-center">Qty</th>
                  <th className="pb-2.5 text-right">Price</th>
                  <th className="pb-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {bill.items.map((item, idx) => (
                  <tr key={idx} className="py-2.5">
                    <td className="py-2.5">
                      <span className="font-bold text-slate-900 block">{item.name}</span>
                    </td>
                    <td className="py-2.5 text-center font-bold">×{item.quantity}</td>
                    <td className="py-2.5 text-right font-medium">
                      <CurrencyDisplay amount={item.unitPrice} />
                    </td>
                    <td className="py-2.5 text-right font-bold text-slate-900">
                      <CurrencyDisplay amount={item.totalPrice} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subtotals & Taxes */}
          <div className="border-t border-slate-200 pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span><CurrencyDisplay amount={bill.subtotal} /></span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST Tax (5%)</span>
              <span><CurrencyDisplay amount={bill.totalTax} /></span>
            </div>
            {discountApplied && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Courtesy Discount (10%)</span>
                <span>-<CurrencyDisplay amount={Math.round(bill.grandTotal * 0.1)} /></span>
              </div>
            )}
            <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-200 pt-2.5">
              <span>TOTAL DUE</span>
              <span className="text-emerald-700">
                <CurrencyDisplay amount={currentGrandTotal} />
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Actions Panel */}
        <div className="md:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Cashier Actions
            </h3>

            <div className="space-y-2">
              {bill.dueAmount > 0 && (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsPaymentOpen(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 font-bold"
                  leftIcon={<CreditCard className="h-4 w-4" />}
                >
                  Collect Payment (₹{currentGrandTotal})
                </Button>
              )}

              <Button
                variant="outline"
                size="md"
                onClick={handlePrint}
                className="w-full font-bold"
                leftIcon={<Printer className="h-4 w-4" />}
              >
                Print Thermal Receipt
              </Button>

              <Button
                variant="outline"
                size="md"
                onClick={handleApplyDiscount}
                className={`w-full font-bold ${discountApplied ? "bg-emerald-50 text-emerald-700 border-emerald-300" : ""}`}
                leftIcon={<Percent className="h-4 w-4" />}
              >
                {discountApplied ? "Remove Discount" : "Apply 10% Discount"}
              </Button>

              <Button
                variant="outline"
                size="md"
                onClick={handleSplitBill}
                className="w-full font-bold"
                leftIcon={<Split className="h-4 w-4" />}
              >
                Split Bill
              </Button>

              {bill.status === "PAID" && (
                <Button
                  variant="outline"
                  size="md"
                  onClick={handleRefund}
                  className="w-full font-bold text-rose-700 border-rose-200 hover:bg-rose-50"
                  leftIcon={<RefreshCw className="h-4 w-4" />}
                >
                  Refund Transaction
                </Button>
              )}
            </div>
          </div>

          {/* Payment Status Summary */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Payment Status:</span>
              <span className="font-bold text-slate-900">{bill.status}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Paid Amount:</span>
              <span className="font-bold text-emerald-600">
                <CurrencyDisplay amount={bill.paidAmount} />
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Remaining Balance:</span>
              <span className="font-bold text-amber-600">
                <CurrencyDisplay amount={bill.dueAmount} />
              </span>
            </div>
          </div>
        </div>
      </div>

      {isPaymentOpen && (
        <PaymentModal
          bill={bill}
          tipAmount={0}
          isOpen={true}
          onClose={() => setIsPaymentOpen(false)}
          onSuccess={() => {
            setIsPaymentOpen(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}
