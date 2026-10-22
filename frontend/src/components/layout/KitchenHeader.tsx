"use client";

import * as React from "react";
import { useWebSocketConnection } from "@/hooks/useWebSocket";
import { ChefHat, Volume2, VolumeX, Wifi, WifiOff } from "lucide-react";
import { UserWorkspaceMenu } from "./UserWorkspaceMenu";

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
    <header className="sticky top-0 z-40 border-b border-neutral-800 bg-black px-4 sm:px-6 py-3 text-white">
      <div className="flex items-center justify-between">
        {/* Left: KDS Brand & Ticket Counter */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-neutral-900 border border-neutral-700 text-white font-bold">
              <ChefHat className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight uppercase text-white">
                SCULPX Kitchen
              </h1>
              <p className="text-[10px] text-neutral-400">Kitchen Display &amp; Expediter</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-[4px] bg-neutral-900 border border-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-300">
            <span>Active:</span>
            <span className="font-bold text-white">{activeCount}</span>
          </div>
        </div>

        {/* Right: Live Clock, Sound, Socket & User Logout */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-label="Toggle audio alerts"
            className="hidden sm:flex items-center gap-1.5 rounded-[6px] border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs font-medium text-neutral-300 hover:text-white cursor-pointer"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="h-3.5 w-3.5 text-neutral-200" />
                <span>Audio</span>
              </>
            ) : (
              <>
                <VolumeX className="h-3.5 w-3.5 text-neutral-500" />
                <span>Muted</span>
              </>
            )}
          </button>

          <div className="hidden md:flex items-center gap-2 rounded-[6px] bg-neutral-900 border border-neutral-800 px-2.5 py-1 text-xs font-mono font-medium text-neutral-300">
            {isConnected ? (
              <Wifi className="h-3 w-3 text-white" />
            ) : (
              <WifiOff className="h-3 w-3 text-neutral-500" />
            )}
            <span>{time}</span>
          </div>

          <div className="pl-2 border-l border-neutral-800">
            <UserWorkspaceMenu theme="dark" />
          </div>
        </div>
      </div>
    </header>
  );
}
