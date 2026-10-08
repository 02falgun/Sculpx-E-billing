"use client";

import * as React from "react";
import { useWebSocketConnection } from "@/hooks/useWebSocket";
import { ChefHat, Volume2, VolumeX, Wifi, WifiOff } from "lucide-react";

export interface KitchenHeaderProps {
  activeCount: number;
}

export function KitchenHeader({ activeCount }: KitchenHeaderProps) {
  const wsState = useWebSocketConnection();
  const [time, setTime] = React.useState<string>("");
  const [soundEnabled, setSoundEnabled] = React.useState<boolean>(true);

  React.useEffect(() => {
    const updateTime = () => {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour12: true,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const isConnected = wsState === "CONNECTED";

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950 px-6 py-3.5 text-white shadow-md">
      <div className="flex items-center justify-between">
        {/* Left: KDS Brand & Ticket Counter */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black">
              <ChefHat className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-wide uppercase text-white">
                Kitchen Display System (KDS)
              </h1>
              <p className="text-[11px] font-semibold text-slate-400">Main Kitchen Expedite</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-bold text-amber-400">
            <span>Active Tickets:</span>
            <span className="text-sm font-black text-white">{activeCount}</span>
          </div>
        </div>

        {/* Right: Live Clock, Sound & Socket */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-label="Toggle audio alerts"
            className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="h-4 w-4 text-emerald-400" />
                <span>Audio On</span>
              </>
            ) : (
              <>
                <VolumeX className="h-4 w-4 text-slate-500" />
                <span>Audio Muted</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 py-1 text-xs font-mono font-bold text-slate-200">
            {isConnected ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            ) : (
              <WifiOff className="h-3.5 w-3.5 text-amber-400" />
            )}
            <span>{time}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
