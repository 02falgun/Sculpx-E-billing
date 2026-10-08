"use client";

import * as React from "react";
import { MenuItem } from "@/types";
import { DietIndicator, CurrencyDisplay } from "@/components/shared";
import { Button } from "@/components/ui/Button";
import { useCartStore, useUIStore } from "@/store";
import { Clock, Plus, Flame, Sparkles } from "lucide-react";

export interface MenuItemCardProps {
  item: MenuItem;
  onOpenModifiers: (item: MenuItem) => void;
  className?: string;
}

export function MenuItemCard({ item, onOpenModifiers, className }: MenuItemCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const addToast = useUIStore((s) => s.addToast);

  const hasModifiers = item.modifierGroups && item.modifierGroups.length > 0;

  const handleQuickAdd = () => {
    if (hasModifiers) {
      onOpenModifiers(item);
    } else {
      addItem(item, [], 1);
      addToast({
        type: "success",
        title: "Added to Order",
        message: `1x ${item.name} added to cart.`,
      });
    }
  };

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs transition-all hover:border-slate-300 hover:shadow-xs ${
        className || ""
      }`}
    >
      <div>
        {/* Top Badges & Dietary */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            <DietIndicator type={item.dietaryType} showLabel />
            {item.spiceLevel !== undefined && item.spiceLevel > 0 && (
              <span
                className="flex items-center gap-0.5 text-[10px] font-medium text-rose-700 bg-rose-50 border border-rose-200/60 px-1.5 py-0.5 rounded-md"
                title={`Spicy Level: ${item.spiceLevel}/3`}
              >
                <Flame className="h-2.5 w-2.5 fill-rose-500 text-rose-500" />
                <span>{item.spiceLevel > 1 ? "Hot" : "Mild"}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {item.isBestseller && (
              <span className="rounded-md bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-800">
                Bestseller
              </span>
            )}
            {item.isChefSpecial && (
              <span className="flex items-center gap-0.5 rounded-md bg-purple-50 border border-purple-200/80 px-2 py-0.5 text-[10px] font-bold tracking-wide text-purple-800">
                <Sparkles className="h-2.5 w-2.5 text-purple-600" />
                <span>Special</span>
              </span>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-sm font-semibold text-slate-900 group-hover:text-amber-800 transition-colors line-clamp-1">
          {item.name}
        </h3>
        <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
          {item.description}
        </p>
      </div>

      {/* Footer: Price, Prep Time & Add Trigger */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
        <div className="flex flex-col">
          <CurrencyDisplay amount={item.price} className="text-base font-bold text-slate-900" />
          <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
            <Clock className="h-3 w-3" />
            <span>{item.preparationTimeMinutes} mins</span>
          </div>
        </div>

        <div className="flex items-center">
          {item.isAvailable ? (
            <Button
              variant="outline"
              size="sm"
              onClick={handleQuickAdd}
              leftIcon={<Plus className="h-3.5 w-3.5 text-amber-600" />}
              className="border-amber-200 bg-amber-50/40 text-amber-900 hover:bg-amber-600 hover:text-white hover:border-amber-600 font-semibold text-xs rounded-lg px-3 transition-colors"
            >
              {hasModifiers ? "Customize" : "Add"}
            </Button>
          ) : (
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-400">
              Sold Out
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
