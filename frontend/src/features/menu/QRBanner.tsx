import * as React from "react";
import { QRContext } from "@/types";
import { UtensilsCrossed, BedDouble, Clock, Sparkles } from "lucide-react";

export interface QRBannerProps {
  context: QRContext;
  className?: string;
}

export function QRBanner({ context, className }: QRBannerProps) {
  const isRoom = context.type === "ROOM";

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-slate-900 border border-slate-800 p-5 text-white shadow-xs ${
        className || ""
      }`}
    >
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            {isRoom ? <BedDouble className="h-5 w-5" /> : <UtensilsCrossed className="h-5 w-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-amber-500/15 border border-amber-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                {isRoom ? "In-Room Dining" : "Table Ordering"}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="h-3 w-3 text-amber-400" />
                <span>Kitchen Service Active</span>
              </span>
            </div>
            <h2 className="mt-1 text-base sm:text-lg font-bold tracking-tight text-white">
              {context.displayName}
            </h2>
            <p className="text-xs text-slate-400 font-medium">{context.hotelName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 text-xs font-semibold text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Digital E-Bill</span>
          </span>
        </div>
      </div>
    </div>
  );
}
