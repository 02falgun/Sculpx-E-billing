import * as React from "react";
import { DietaryType } from "@/types";
import { cn } from "@/lib/utils";

export interface DietIndicatorProps {
  type: DietaryType;
  showLabel?: boolean;
  className?: string;
}

export function DietIndicator({ type, showLabel = false, className }: DietIndicatorProps) {
  if (type === "VEG") {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <span
          className="flex h-4 w-4 items-center justify-center rounded-[3px] border border-emerald-600 p-[2px]"
          title="Vegetarian"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-600" />
        </span>
        {showLabel && <span className="text-xs font-medium text-emerald-700">Veg</span>}
      </span>
    );
  }

  if (type === "NON_VEG") {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <span
          className="flex h-4 w-4 items-center justify-center rounded-[3px] border border-rose-600 p-[2px]"
          title="Non-Vegetarian"
        >
          <span className="h-2 w-2 rounded-full bg-rose-600" />
        </span>
        {showLabel && <span className="text-xs font-medium text-rose-700">Non-Veg</span>}
      </span>
    );
  }

  if (type === "EGG") {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <span
          className="flex h-4 w-4 items-center justify-center rounded-[3px] border border-amber-600 p-[2px]"
          title="Contains Egg"
        >
          <span className="h-2 w-2 rounded-full bg-amber-600" />
        </span>
        {showLabel && <span className="text-xs font-medium text-amber-700">Egg</span>}
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className="flex h-4 w-4 items-center justify-center rounded-[3px] border border-emerald-700 p-[2px]"
        title="Vegan"
      >
        <span className="text-[10px] font-bold text-emerald-700 leading-none">V</span>
      </span>
      {showLabel && <span className="text-xs font-medium text-emerald-800">Vegan</span>}
    </span>
  );
}
