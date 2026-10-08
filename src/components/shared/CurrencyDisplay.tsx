import * as React from "react";
import { formatCurrency } from "@/lib/utils";
import { ENV } from "@/config";

export interface CurrencyDisplayProps {
  amount: number;
  className?: string;
  symbol?: string;
}

export function CurrencyDisplay({
  amount,
  className,
  symbol = ENV.CURRENCY_SYMBOL,
}: CurrencyDisplayProps) {
  return (
    <span className={`font-semibold tracking-tight text-slate-900 ${className || ""}`}>
      {formatCurrency(amount, symbol)}
    </span>
  );
}
