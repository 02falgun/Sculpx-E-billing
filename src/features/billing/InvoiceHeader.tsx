"use client";

import * as React from "react";
import { Bill } from "@/types";
import { StatusBadge, QRContextBadge } from "@/components/shared";
import { Calendar, ReceiptText, ShieldCheck } from "lucide-react";

interface InvoiceHeaderProps {
  bill: Bill;
}

export function InvoiceHeader({ bill }: InvoiceHeaderProps) {
  const formattedDate = React.useMemo(() => {
    try {
      return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(bill.createdAt));
    } catch {
      return "";
    }
  }, [bill.createdAt]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
      {/* Hotel Brand Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-amber-600 block mb-1">
            Official GST Tax Invoice / Digital E-Bill
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {bill.qrContext.hotelName || "The Grand Royal Palace & Resort"}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-md leading-relaxed">
            Main Pavilion, Heritage Wing, Palace Road, New Delhi 110001
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400 mt-2">
            <span>GSTIN: <strong className="text-slate-600 font-semibold">07AAAAA0000A1Z5</strong></span>
            <span>•</span>
            <span>FSSAI Lic: <strong className="text-slate-600 font-semibold">10019011006123</strong></span>
          </div>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-2">
          <StatusBadge status={bill.status} type="bill" />
          <div className="text-right">
            <span className="text-xs text-slate-400 font-medium block">Invoice Number</span>
            <span className="text-sm font-bold text-slate-900 tracking-tight">
              #{bill.billNumber}
            </span>
          </div>
        </div>
      </div>

      {/* Meta Row: Table/Room, Order No, Timestamp */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
        <div className="space-y-1">
          <span className="text-slate-400 font-medium text-[11px]">Dining Context</span>
          <div>
            <QRContextBadge context={bill.qrContext} />
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-slate-400 font-medium text-[11px]">Linked Order</span>
          <div className="flex items-center gap-1.5 font-bold text-slate-800">
            <ReceiptText className="h-3.5 w-3.5 text-amber-600" />
            <span>#{bill.orderNumber}</span>
          </div>
        </div>

        <div className="space-y-1 sm:text-right">
          <span className="text-slate-400 font-medium text-[11px]">Date & Time</span>
          <div className="flex items-center sm:justify-end gap-1.5 font-medium text-slate-700">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>{formattedDate}</span>
          </div>
        </div>
      </div>

      {/* Verified e-billing watermark banner */}
      <div className="flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 p-2.5 text-[11px] text-slate-500">
        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>
          Digitally certified invoice verified with restaurant POS system and tax records.
        </span>
      </div>
    </div>
  );
}
