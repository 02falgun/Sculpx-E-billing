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
    <div className={cn("sticky top-16 z-30 bg-slate-50/95 backdrop-blur-md py-3", className)}>
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth px-1">
        <button
          type="button"
          onClick={() => onSelectCategory("all")}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all active:scale-95",
            activeCategoryId === "all"
              ? "bg-amber-600 text-white shadow-sm shadow-amber-600/30"
              : "bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-100",
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
                "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all active:scale-95",
                isActive
                  ? "bg-amber-600 text-white shadow-sm shadow-amber-600/30"
                  : "bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-100",
              )}
            >
              <span>{category.name}</span>
              {category.itemCount !== undefined && (
                <span
                  className={cn(
                    "flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-extrabold",
                    isActive ? "bg-white text-amber-700" : "bg-slate-100 text-slate-500",
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
