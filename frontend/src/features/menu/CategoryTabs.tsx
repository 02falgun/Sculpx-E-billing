"use client";

import * as React from "react";
import { Category } from "@/types";
import { cn } from "@/lib/utils";

export interface CategoryTabsProps {
  categories: Category[];
  activeCategoryId: string;
  onSelectCategory: (id: string) => void;
  className?: string;
}

export function CategoryTabs({
  categories,
  activeCategoryId,
  onSelectCategory,
  className,
}: CategoryTabsProps) {
  return (
    <div className={cn("sticky top-16 z-30 bg-slate-50/95 backdrop-blur-xs py-2.5 border-b border-slate-200/60", className)}>
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth px-1">
        <button
          type="button"
          onClick={() => onSelectCategory("all")}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer",
            activeCategoryId === "all"
              ? "bg-slate-900 text-white shadow-xs"
              : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900",
          )}
        >
          <span>All Dishes</span>
        </button>

        {categories.map((category) => {
          const isActive = category.id === activeCategoryId;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onSelectCategory(category.id)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all active:scale-95 cursor-pointer",
                isActive
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900",
              )}
            >
              <span>{category.name}</span>
              {category.itemCount !== undefined && (
                <span
                  className={cn(
                    "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums",
                    isActive ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-500",
                  )}
                >
                  {category.itemCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
