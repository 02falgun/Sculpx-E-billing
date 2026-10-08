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
      className={`inline-flex items-center gap-2 rounded-md bg-neutral-900 border border-neutral-800 px-2.5 py-1 text-xs text-white ${className || ""}`}
    >
      <div className="flex h-4.5 w-4.5 items-center justify-center rounded bg-white text-black font-bold shrink-0">
        {isRoom ? <BedDouble className="h-3 w-3" /> : <UtensilsCrossed className="h-3 w-3" />}
      </div>
      <div className="flex flex-col text-left leading-tight">
        <span className="font-semibold tracking-tight text-white">{title}</span>
        <span className="text-[10px] text-neutral-400">{context.hotelName || "SCULPX Grand Hotel"}</span>
      </div>
    </div>
  );
}
