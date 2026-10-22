"use client";

import * as React from "react";
import { SearchInput } from "@/components/ui/SearchInput";
import { DietIndicator } from "@/components/shared";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type DietaryFilter = "ALL" | "VEG" | "NON_VEG" | "CHEF_SPECIAL" | "BESTSELLER";

export interface MenuSearchAndFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  dietaryFilter: DietaryFilter;
  onDietaryFilterChange: (filter: DietaryFilter) => void;
  className?: string;
}

export function MenuSearchAndFilter({
  searchQuery,
  onSearchChange,
  dietaryFilter,
  onDietaryFilterChange,
  className,
}: MenuSearchAndFilterProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <SearchInput
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="What are you craving? Search dishes, drinks, desserts..."
      />

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => onDietaryFilterChange("ALL")}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all active:scale-95 cursor-pointer",
            dietaryFilter === "ALL"
              ? "bg-black text-white shadow-xs"
              : "bg-white text-neutral-800 border border-neutral-200 hover:bg-neutral-50",
          )}
        >
          All
        </button>

        <button
          type="button"
          onClick={() => onDietaryFilterChange("VEG")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all active:scale-95 cursor-pointer",
            dietaryFilter === "VEG"
              ? "bg-black text-white shadow-xs"
              : "bg-white text-neutral-800 border border-neutral-200 hover:bg-neutral-50",
          )}
        >
          <DietIndicator type="VEG" />
          <span>Veg Only</span>
        </button>

        <button
          type="button"
          onClick={() => onDietaryFilterChange("NON_VEG")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all active:scale-95 cursor-pointer",
            dietaryFilter === "NON_VEG"
              ? "bg-black text-white shadow-xs"
              : "bg-white text-neutral-800 border border-neutral-200 hover:bg-neutral-50",
          )}
        >
          <DietIndicator type="NON_VEG" />
          <span>Non-Veg</span>
        </button>

        <button
          type="button"
          onClick={() => onDietaryFilterChange("BESTSELLER")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all active:scale-95 cursor-pointer",
            dietaryFilter === "BESTSELLER"
              ? "bg-black text-white shadow-xs"
              : "bg-white text-neutral-800 border border-neutral-200 hover:bg-neutral-50",
          )}
        >
          <span>Popular / Bestsellers</span>
        </button>

        <button
          type="button"
          onClick={() => onDietaryFilterChange("CHEF_SPECIAL")}
          className={cn(
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-all active:scale-95 cursor-pointer",
            dietaryFilter === "CHEF_SPECIAL"
              ? "bg-black text-white shadow-xs"
              : "bg-white text-neutral-800 border border-neutral-200 hover:bg-neutral-50",
          )}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Chef Specials</span>
        </button>
      </div>
    </div>
  );
}
