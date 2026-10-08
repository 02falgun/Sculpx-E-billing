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
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 p-5 text-white shadow-md ${
        className || ""
      }`}
    >
      {/* Decorative background glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl" />

      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-slate-950 shadow-md">
            {isRoom ? <BedDouble className="h-6 w-6" /> : <UtensilsCrossed className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
                {isRoom ? "In-Room Dining" : "Table Ordering"}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-300">
                <Clock className="h-3 w-3 text-amber-400" />
                <span>Kitchen Open</span>
              </span>
            </div>
            <h2 className="mt-1 text-lg font-black tracking-tight text-white">
              {context.displayName}
            </h2>
            <p className="text-xs text-slate-300 font-medium">{context.hotelName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Digital E-Bill Supported</span>
          </span>
        </div>
      </div>
    </div>
  );
}
