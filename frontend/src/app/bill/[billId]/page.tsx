"use client";

import * as React from "react";
import Link from "next/link";
import { useBill } from "@/hooks/useBilling";
import { useBillingUpdates } from "@/hooks/useWebSocket";
import {
  InvoiceHeader,
  InvoiceItemsTable,
  TipSelector,
  PaymentModal,
  DigitalReceiptActions,
} from "@/features/billing";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/EmptyState";
import { CurrencyDisplay } from "@/components/shared";
import { CreditCard, ArrowLeft, Home } from "lucide-react";

interface BillPageProps {
  params: Promise<{
    billId: string;
  }>;
}

export default function DigitalBillPage({ params }: BillPageProps) {
  const unwrappedParams = React.use(params);
  const billId = unwrappedParams.billId;

  const { data: bill, isLoading, error, refetch } = useBill(billId);
  useBillingUpdates(billId);

  const [tipAmount, setTipAmount] = React.useState<number>(0);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" className="text-amber-500" />
        <p className="text-xs font-semibold text-slate-500">Generating digital e-bill...</p>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div className="py-12 space-y-4 max-w-md mx-auto">
        <ErrorState
          title="Bill Not Found"
          message={
            error instanceof Error
              ? error.message
              : "Unable to retrieve invoice details. Please verify your order number or contact hotel staff."
          }
          onRetry={() => refetch()}
        />
        <div className="text-center">
          <Link href="/">
            <Button variant="outline" size="sm" leftIcon={<Home className="h-4 w-4" />}>
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = bill.status === "PAID" || bill.dueAmount <= 0;
  const netPayable = Math.max(0, bill.dueAmount + tipAmount);

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      {/* Top back navigation */}
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/order/${bill.orderId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-amber-600 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Order Status</span>
        </Link>
        <Link
          href={`/menu/${bill.qrContext.token}`}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          View Menu
        </Link>
      </div>

      {/* Official Tax Invoice Header */}
      <InvoiceHeader bill={bill} />

      {/* Itemized Table & Tax Breakdown */}
      <InvoiceItemsTable bill={bill} tipAmount={tipAmount} />

      {/* Bill Lifecycle & Verification Timeline */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Bill Lifecycle &amp; Settlement Audit
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">1. Linked Order</span>
            <span className="font-bold text-slate-800">#{bill.orderNumber}</span>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">2. Invoice Generated</span>
            <span className="font-bold text-slate-800">
              {new Date(bill.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">3. Settlement</span>
            <span className={`font-bold ${isPaid ? "text-emerald-700" : "text-amber-700"}`}>
              {isPaid ? "Paid & Settled" : "Outstanding Due"}
            </span>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-2.5">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">4. GST Archive</span>
            <span className="font-bold text-emerald-700">Certified Tax Record</span>
          </div>
        </div>
      </div>

      {/* If Unpaid: Tip selector + Pay CTA */}
      {!isPaid ? (
        <div className="space-y-4 print:hidden">
          <TipSelector
            baseAmount={bill.dueAmount}
            selectedTip={tipAmount}
            onTipChange={(val) => setTipAmount(val)}
          />

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="w-full font-bold shadow-lg shadow-amber-600/25 py-3.5 text-base"
              onClick={() => setIsPaymentModalOpen(true)}
              leftIcon={<CreditCard className="h-5 w-5" />}
            >
              <span>Proceed to Settle • </span>
              <CurrencyDisplay amount={netPayable} className="text-white ml-1 font-black" />
            </Button>
            <p className="text-center text-[11px] text-slate-400">
              Instant digital receipt with GST details upon payment completion
            </p>
          </div>
        </div>
      ) : (
        /* If Paid: Verified receipt card, download/print & feedback */
        <DigitalReceiptActions bill={bill} />
      )}

      {/* Payment Settlement Modal */}
      <PaymentModal
        bill={bill}
        tipAmount={tipAmount}
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
