"use client";

import * as React from "react";
import { useActiveKOTs } from "@/hooks/useKitchen";
import { useKitchenUpdates } from "@/hooks/useWebSocket";
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
} from "lucide-react";

export function KDSBoard() {
  const { data: kots = [], isLoading, error, refetch } = useActiveKOTs();
  useKitchenUpdates();

  const [filterStage, setFilterStage] = React.useState<"ALL" | "NEW" | "PREPARING" | "READY">("ALL");

  const filteredKOTs = React.useMemo(() => {
    return kots.filter((kot) => {
      if (filterStage === "ALL") return true;
      if (filterStage === "NEW") return kot.status === "NEW" || kot.status === "ACCEPTED";
      if (filterStage === "PREPARING") return kot.status === "PREPARING";
      if (filterStage === "READY") return kot.status === "READY";
      return true;
    });
  }, [kots, filterStage]);

  const stats = React.useMemo(() => {
    const total = kots.length;
    const newCount = kots.filter((k) => k.status === "NEW" || k.status === "ACCEPTED").length;
    const cooking = kots.filter((k) => k.status === "PREPARING").length;
    const ready = kots.filter((k) => k.status === "READY").length;
    return { total, newCount, cooking, ready };
  }, [kots]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => {
              setViewMode("COLUMNS");
              setFilterStage("ALL");
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              viewMode === "COLUMNS"
                ? "bg-amber-500 text-slate-950 shadow-md font-black"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            <span>Columns View</span>
            <span className="rounded-md bg-slate-950/40 px-1.5 py-0.5 text-[10px] font-black">
              {stats.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("FILTER");
              setFilterStage("NEW");
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              viewMode === "FILTER" && filterStage === "NEW"
                ? "bg-blue-600 text-white shadow-md font-black"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>New KOTs</span>
            <span className="rounded-md bg-slate-950/40 px-1.5 py-0.5 text-[10px] font-black">
              {stats.newCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("FILTER");
              setFilterStage("PREPARING");
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              viewMode === "FILTER" && filterStage === "PREPARING"
                ? "bg-amber-600 text-white shadow-md font-black"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>Preparing</span>
            <span className="rounded-md bg-slate-950/40 px-1.5 py-0.5 text-[10px] font-black">
              {stats.cooking}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("FILTER");
              setFilterStage("READY");
            }}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              viewMode === "FILTER" && filterStage === "READY"
                ? "bg-emerald-600 text-white shadow-md font-black"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Ready</span>
            <span className="rounded-md bg-slate-950/40 px-1.5 py-0.5 text-[10px] font-black">
              {stats.ready}
            </span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Kitchen Live WebSocket Sync Active</span>
        </div>
      </div>

      {/* Columns View Mode */}
      {viewMode === "COLUMNS" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Column 1: NEW KOTs */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-blue-500" />
                <h3 className="font-black text-sm uppercase tracking-wider text-white">
                  NEW KOTs
                </h3>
              </div>
              <span className="bg-blue-950 border border-blue-800 text-blue-300 text-xs px-2 py-0.5 rounded-full font-bold">
                {newKOTs.length}
              </span>
            </div>

            <div className="space-y-4">
              {newKOTs.length > 0 ? (
                newKOTs.map((kot) => <KOTCard key={kot.id} kot={kot} />)
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  No new orders waiting
                </div>
              )}
            </div>
          </div>

          {/* Column 2: PREPARING */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-500" />
                <h3 className="font-black text-sm uppercase tracking-wider text-white">
                  PREPARING
                </h3>
              </div>
              <span className="bg-amber-950 border border-amber-800 text-amber-300 text-xs px-2 py-0.5 rounded-full font-bold">
                {preparingKOTs.length}
              </span>
            </div>

            <div className="space-y-4">
              {preparingKOTs.length > 0 ? (
                preparingKOTs.map((kot) => <KOTCard key={kot.id} kot={kot} />)
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  No tickets on the cooking line
                </div>
              )}
            </div>
          </div>

          {/* Column 3: READY */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <h3 className="font-black text-sm uppercase tracking-wider text-white">
                  READY FOR EXPEDITE
                </h3>
              </div>
              <span className="bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs px-2 py-0.5 rounded-full font-bold">
                {readyKOTs.length}
              </span>
            </div>

            <div className="space-y-4">
              {readyKOTs.length > 0 ? (
                readyKOTs.map((kot) => <KOTCard key={kot.id} kot={kot} />)
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  No plates waiting on the counter
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
