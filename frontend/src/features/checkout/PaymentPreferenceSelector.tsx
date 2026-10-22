"use client";

import * as React from "react";
import { PaymentPreference, QRContext } from "@/types";
import { CreditCard, BedDouble, Banknote, CheckCircle2 } from "lucide-react";

export interface PaymentPreferenceSelectorProps {
  value: PaymentPreference;
  onChange: (value: PaymentPreference) => void;
  context: QRContext | null;
  className?: string;
}

export function PaymentPreferenceSelector({
  value,
  onChange,
  context,
  className,
}: PaymentPreferenceSelectorProps) {
  const isRoom = context?.type === "ROOM";

  const options: {
    id: PaymentPreference;
    title: string;
    description: string;
    icon: React.ReactNode;
    badge: string;
  }[] = [
    {
      id: "PAY_NOW",
      title: "Pay Now Online",
      description: "Instant contactless checkout via UPI, Cards, or NetBanking",
      icon: <CreditCard className="h-5 w-5 text-amber-500" />,
      badge: "Fastest",
    },
    {
      id: "PAY_LATER",
      title: isRoom ? "Post to Room Folio" : "Pay Later at Table",
      description: isRoom
        ? `Added to Room ${context?.identifier || "301"} folio on checkout`
        : "Settle bill with floor staff via Cash, Card, or UPI after meal",
      icon: isRoom ? (
        <BedDouble className="h-5 w-5 text-blue-500" />
      ) : (
        <Banknote className="h-5 w-5 text-emerald-500" />
      ),
      badge: isRoom ? "Hotel Guest" : "Dine In",
    },
  ];

  return (
    <div className={`space-y-3 ${className || ""}`}>
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">
        Payment Preference
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange(option.id)}
              className={`relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all active:scale-[0.99] cursor-pointer ${
                isSelected
                  ? "border-amber-600 bg-amber-50/20 shadow-2xs ring-1 ring-amber-600/30"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
              }`}
            >
              <div className="flex items-start justify-between w-full mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      isSelected ? "bg-white shadow-xs" : "bg-slate-100"
                    }`}
                  >
                    {option.icon}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {option.badge}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">
                      {option.title}
                    </h4>
                  </div>
                </div>

                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    isSelected
                      ? "border-amber-600 bg-amber-600 text-white"
                      : "border-slate-300 bg-white"
                  }`}
                >
                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                </div>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">{option.description}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
