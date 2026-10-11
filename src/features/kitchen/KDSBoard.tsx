"use client";

import * as React from "react";
import { useActiveKOTs } from "@/hooks/useKitchen";
import { useKitchenUpdates, useWebSocketConnection } from "@/hooks/useWebSocket";
import { webSocketManager } from "@/services/websocket";
import { KOTCard } from "./KOTCard";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import {
  ChefHat,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";

export function KDSBoard() {
  const { data: kots = [], isLoading, error, refetch, isFetching } = useActiveKOTs();
  useKitchenUpdates();
  const connectionState = useWebSocketConnection();

  const [filterStage, setFilterStage] = React.useState<"ALL" | "NEW" | "PREPARING" | "READY">("ALL");

  // Prevent duplicate visual tickets when events are replayed
  const deduplicatedKOTs = React.useMemo(() => {
    const seen = new Set<string>();
    return kots.filter((kot) => {
      const key = kot.id || kot.kotNumber;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [kots]);

  const filteredKOTs = React.useMemo(() => {
    return deduplicatedKOTs.filter((kot) => {
      if (filterStage === "ALL") return true;
      if (filterStage === "NEW") return kot.status === "NEW" || kot.status === "ACCEPTED";
      if (filterStage === "PREPARING") return kot.status === "PREPARING";
      if (filterStage === "READY") return kot.status === "READY";
      return true;
    });
  }, [deduplicatedKOTs, filterStage]);

  const stats = React.useMemo(() => {
    const total = deduplicatedKOTs.length;
    const newCount = deduplicatedKOTs.filter((k) => k.status === "NEW" || k.status === "ACCEPTED").length;
    const cooking = deduplicatedKOTs.filter((k) => k.status === "PREPARING").length;
    const ready = deduplicatedKOTs.filter((k) => k.status === "READY").length;
    return { total, newCount, cooking, ready };
  }, [deduplicatedKOTs]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Spinner size="lg" className="text-amber-500" />
        <p className="text-xs font-semibold text-slate-400">Connecting to kitchen display line...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8">
        <ErrorState
          title="KDS Error"
          message={error instanceof Error ? error.message : "Failed to load active KOT tickets."}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const [viewMode, setViewMode] = React.useState<"COLUMNS" | "FILTER">("COLUMNS");

  const newKOTs = React.useMemo(
    () => kots.filter((k) => k.status === "NEW" || k.status === "ACCEPTED"),
    [kots]
  );
  const preparingKOTs = React.useMemo(
    () => kots.filter((k) => k.status === "PREPARING"),
    [kots]
  );
  const readyKOTs = React.useMemo(
    () => kots.filter((k) => k.status === "READY"),
    [kots]
  );

  return (
    <div className="space-y-6">
      {/* Top Controls: Mode switcher & Stage counts */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setViewMode("COLUMNS");
              setFilterStage("ALL");
            }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "COLUMNS"
                ? "bg-white text-black shadow-xs"
                : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:bg-neutral-800 hover:text-white"
            }`}
          >
            <span>Columns View</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${viewMode === "COLUMNS" ? "bg-neutral-200 text-black" : "bg-neutral-800 text-neutral-300"}`}>
              {stats.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("FILTER");
              setFilterStage("NEW");
            }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "FILTER" && filterStage === "NEW"
                ? "bg-white text-black shadow-xs"
                : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:bg-neutral-800 hover:text-white"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>New</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${viewMode === "FILTER" && filterStage === "NEW" ? "bg-neutral-200 text-black" : "bg-neutral-800 text-neutral-300"}`}>
              {stats.newCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("FILTER");
              setFilterStage("PREPARING");
            }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "FILTER" && filterStage === "PREPARING"
                ? "bg-white text-black shadow-xs"
                : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:bg-neutral-800 hover:text-white"
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>Preparing</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${viewMode === "FILTER" && filterStage === "PREPARING" ? "bg-neutral-200 text-black" : "bg-neutral-800 text-neutral-300"}`}>
              {stats.cooking}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("FILTER");
              setFilterStage("READY");
            }}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              viewMode === "FILTER" && filterStage === "READY"
                ? "bg-white text-black shadow-xs"
                : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:bg-neutral-800 hover:text-white"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Ready</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${viewMode === "FILTER" && filterStage === "READY" ? "bg-neutral-200 text-black" : "bg-neutral-800 text-neutral-300"}`}>
              {stats.ready}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono flex items-center gap-2">
            {connectionState === "CONNECTED" ? (
              <>
                <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400/90 font-medium">Live KDS Sync</span>
              </>
            ) : connectionState === "RECONNECTING" ? (
              <>
                <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-amber-400 font-medium">Reconnecting... (DB Polling)</span>
              </>
            ) : (
              <>
                <span className="flex h-2 w-2 rounded-full bg-rose-400" />
                <span className="text-rose-400 font-medium">Offline (DB Fallback)</span>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              webSocketManager.connect();
              refetch();
            }}
            disabled={isFetching}
            className="flex items-center gap-1 text-[11px] font-semibold text-neutral-400 hover:text-white px-2 py-1 rounded bg-neutral-900 border border-neutral-800 transition-colors cursor-pointer"
            title="Refetch authoritative kitchen tickets from database"
          >
            <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* Columns View Mode */}
      {viewMode === "COLUMNS" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Column 1: NEW KOTs */}
          <div className="bg-neutral-900/80 rounded-lg border border-neutral-800 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-neutral-400" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-200">
                  NEW KOTS
                </h3>
              </div>
              <span className="bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs px-2 py-0.5 rounded font-mono font-semibold">
                {newKOTs.length}
              </span>
            </div>

            <div className="space-y-4">
              {newKOTs.length > 0 ? (
                newKOTs.map((kot) => <KOTCard key={kot.id} kot={kot} />)
              ) : (
                <div className="py-8 text-center text-xs text-neutral-500">
                  No new orders waiting
                </div>
              )}
            </div>
          </div>

          {/* Column 2: PREPARING */}
          <div className="bg-neutral-900/80 rounded-lg border border-neutral-800 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-white" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-200">
                  PREPARING
                </h3>
              </div>
              <span className="bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs px-2 py-0.5 rounded font-mono font-semibold">
                {preparingKOTs.length}
              </span>
            </div>

            <div className="space-y-4">
              {preparingKOTs.length > 0 ? (
                preparingKOTs.map((kot) => <KOTCard key={kot.id} kot={kot} />)
              ) : (
                <div className="py-8 text-center text-xs text-neutral-500">
                  No tickets on cooking line
                </div>
              )}
            </div>
          </div>

          {/* Column 3: READY */}
          <div className="bg-neutral-900/80 rounded-lg border border-neutral-800 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-white" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-neutral-200">
                  READY FOR EXPEDITE
                </h3>
              </div>
              <span className="bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs px-2 py-0.5 rounded font-mono font-semibold">
                {readyKOTs.length}
              </span>
            </div>

            <div className="space-y-4">
              {readyKOTs.length > 0 ? (
                readyKOTs.map((kot) => <KOTCard key={kot.id} kot={kot} />)
              ) : (
                <div className="py-8 text-center text-xs text-neutral-500">
                  No plates waiting on counter
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Filter View Mode */
        <div>
          {filteredKOTs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredKOTs.map((kot) => (
                <KOTCard key={kot.id} kot={kot} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-800 bg-slate-900/50 p-12 text-center my-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-slate-500 mb-3">
                <ChefHat className="h-7 w-7 text-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white">Kitchen is clear</h3>
              <p className="mt-1 text-xs text-slate-400 max-w-sm">
                No orders are waiting right now. Incoming table and room orders will chime here automatically.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
