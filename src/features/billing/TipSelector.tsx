"use client";

import * as React from "react";
import { CurrencyDisplay } from "@/components/shared";
import { Heart } from "lucide-react";

interface TipSelectorProps {
  baseAmount: number;
  selectedTip: number;
  onTipChange: (amount: number) => void;
}

export function TipSelector({ baseAmount, selectedTip, onTipChange }: TipSelectorProps) {
  const [customValue, setCustomValue] = React.useState<string>("");
  const [isCustom, setIsCustom] = React.useState<boolean>(false);

  const fivePercent = Math.round(baseAmount * 0.05);
  const tenPercent = Math.round(baseAmount * 0.10);

  const presets = [
    { label: "No Tip", value: 0 },
    { label: "5%", value: fivePercent },
    { label: "10%", value: tenPercent },
    { label: "₹50", value: 50 },
    { label: "₹100", value: 100 },
  ];

  const handleSelectPreset = (val: number) => {
    setIsCustom(false);
    setCustomValue("");
    onTipChange(val);
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "");
    setCustomValue(val);
    const parsed = parseInt(val, 10);
    onTipChange(isNaN(parsed) ? 0 : parsed);
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
          <Heart className="h-4 w-4 text-rose-500 fill-rose-500" />
          <span>Add Gratuity for the Kitchen & Serving Staff</span>
        </div>
        {selectedTip > 0 && (
          <span className="text-xs font-bold text-amber-600">
            + <CurrencyDisplay amount={selectedTip} />
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {presets.map((preset) => {
          const isSelected = !isCustom && selectedTip === preset.value;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleSelectPreset(preset.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                isSelected
                  ? "bg-black text-white shadow-xs"
                  : "bg-neutral-100 text-neutral-800 hover:bg-neutral-200 border border-neutral-200"
              }`}
            >
              {preset.label}
              {preset.value > 0 && (
                <span className="ml-1 opacity-80 text-[10px] font-normal">
                  (₹{preset.value})
                </span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => {
            setIsCustom(true);
            onTipChange(customValue ? parseInt(customValue, 10) || 0 : 0);
          }}
          className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
            isCustom
              ? "bg-black text-white shadow-xs"
              : "bg-neutral-100 text-neutral-800 hover:bg-neutral-200 border border-neutral-200"
          }`}
        >
          Custom
        </button>
      </div>

      {isCustom && (
        <div className="pt-1">
          <div className="relative max-w-xs">
            <span className="absolute left-3 top-2 text-xs text-neutral-400 font-bold">₹</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter custom tip amount"
              value={customValue}
              onChange={handleCustomChange}
              className="w-full rounded-md border border-neutral-300 py-1.5 pl-7 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-black focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
