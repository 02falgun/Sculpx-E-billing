"use client";

import * as React from "react";
import { Bill } from "@/types";
import { CurrencyDisplay } from "@/components/shared";

interface InvoiceItemsTableProps {
  bill: Bill;
  tipAmount?: number;
}

export function InvoiceItemsTable({ bill, tipAmount = 0 }: InvoiceItemsTableProps) {
  const finalPayable = Math.max(0, bill.dueAmount + tipAmount);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-900">Itemized Charges</h3>
        <span className="text-xs text-slate-500 font-medium">
          {bill.items.reduce((acc, i) => acc + i.quantity, 0)} items
        </span>
      </div>

      {/* Table header */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <th className="pb-2.5">Item Description</th>
              <th className="pb-2.5 text-center w-12">Qty</th>
              <th className="pb-2.5 text-right w-20">Rate</th>
              <th className="pb-2.5 text-right w-24">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {bill.items.map((item) => (
              <tr key={item.id} className="text-slate-800">
                <td className="py-3 pr-2">
                  <span className="font-semibold text-slate-900 block">{item.name}</span>
                </td>
                <td className="py-3 text-center text-slate-600 font-medium">
                  {item.quantity}
                </td>
                <td className="py-3 text-right text-slate-600">
                  <CurrencyDisplay amount={item.unitPrice} />
                </td>
                <td className="py-3 text-right font-bold text-slate-900">
                  <CurrencyDisplay amount={item.totalPrice} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Financial Calculations */}
      <div className="border-t border-slate-200 pt-4 space-y-2 text-xs">
        <div className="flex justify-between text-slate-600">
          <span>Subtotal</span>
          <CurrencyDisplay amount={bill.subtotal} className="font-medium text-slate-800" />
        </div>

        {/* Taxes breakdown */}
        {bill.taxes.map((t, idx) => (
          <div key={idx} className="flex justify-between text-slate-500">
            <span>{t.name}</span>
            <CurrencyDisplay amount={t.amount} />
          </div>
        ))}

        {/* Discounts */}
        {bill.totalDiscount > 0 && (
          <div className="flex justify-between text-emerald-600 font-medium">
            <span>Special Discount Applied</span>
            <span>- <CurrencyDisplay amount={bill.totalDiscount} /></span>
          </div>
        )}

        {/* Round off */}
        {bill.roundOff !== 0 && (
          <div className="flex justify-between text-slate-400 text-[11px]">
            <span>Round Off</span>
            <CurrencyDisplay amount={bill.roundOff} />
          </div>
        )}

        {/* Grand Total */}
        <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-dashed border-slate-200">
          <span>Bill Amount</span>
          <CurrencyDisplay amount={bill.grandTotal} className="font-extrabold text-slate-900" />
        </div>

        {/* Tip (if added) */}
        {tipAmount > 0 && (
          <div className="flex justify-between text-amber-700 font-semibold pt-1">
            <span>Added Gratuity / Tip</span>
            <span>+ <CurrencyDisplay amount={tipAmount} /></span>
          </div>
        )}

        {/* Paid Amount */}
        {bill.paidAmount > 0 && (
          <div className="flex justify-between text-emerald-600 font-bold pt-1">
            <span>Amount Already Paid</span>
            <span>- <CurrencyDisplay amount={bill.paidAmount} /></span>
          </div>
        )}

        {/* Balance Due */}
        <div className="flex justify-between items-center text-sm font-black pt-3 border-t-2 border-slate-900">
          <span className="text-slate-900">
            {bill.dueAmount <= 0 && tipAmount === 0 ? "Status Settled" : "Net Payable Due"}
          </span>
          <CurrencyDisplay
            amount={finalPayable}
            className={`text-lg font-black ${
              bill.dueAmount <= 0 && tipAmount === 0 ? "text-emerald-600" : "text-amber-600"
            }`}
          />
        </div>
      </div>
    </div>
  );
}
