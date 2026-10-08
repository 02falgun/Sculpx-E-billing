import * as React from "react";
import { QRContext } from "@/types";
import { BedDouble, UtensilsCrossed } from "lucide-react";

export interface QRContextBadgeProps {
  context: QRContext | null;
  className?: string;
}

export function QRContextBadge({ context, className }: QRContextBadgeProps) {
  if (!context) return null;

  const isRoom = context.type === "ROOM";
  const title = isRoom
    ? `In-room dining · ${context.displayName}`
    : `Dining at ${context.displayName}`;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-1.5 text-xs text-white shadow-sm ${className || ""}`}
    >
      <div className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500 text-slate-950 font-bold shrink-0">
        {isRoom ? <BedDouble className="h-3.5 w-3.5" /> : <UtensilsCrossed className="h-3.5 w-3.5" />}
      </div>
      <div className="flex flex-col text-left leading-tight">
        <span className="font-bold tracking-tight text-white">{title}</span>
        <span className="text-[10px] text-slate-400">{context.hotelName || "SCULPX Grand Hotel"}</span>
      </div>
    </div>
  );
}
