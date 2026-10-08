"use client";

import * as React from "react";
import { Clock, Flame, AlertCircle } from "lucide-react";

interface KOTTimerProps {
  createdAt: string;
}

export function KOTTimer({ createdAt }: KOTTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = React.useState<number>(0);

  React.useEffect(() => {
    const calculateElapsed = () => {
      const createdTime = new Date(createdAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - createdTime) / 1000));
      setElapsedSeconds(diff);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const formatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  // Urgency styling
  if (minutes >= 15) {
    return (
      <div className="flex items-center gap-1 rounded-lg bg-rose-500/20 px-2 py-0.5 text-xs font-mono font-black text-rose-400 border border-rose-500/40 animate-pulse">
        <Flame className="h-3.5 w-3.5 text-rose-500" />
        <span>{formatted}</span>
      </div>
    );
  }

  if (minutes >= 10) {
    return (
      <div className="flex items-center gap-1 rounded-lg bg-amber-500/20 px-2 py-0.5 text-xs font-mono font-black text-amber-400 border border-amber-500/40">
        <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
        <span>{formatted}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-0.5 text-xs font-mono font-bold text-slate-300 border border-slate-700">
      <Clock className="h-3.5 w-3.5 text-emerald-400" />
      <span>{formatted}</span>
    </div>
  );
}
