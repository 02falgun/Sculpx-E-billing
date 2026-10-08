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

  return (
    <div className="space-y-6">
      {/* Top Filter & Metric Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        {/* Stage Filter Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setFilterStage("ALL")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              filterStage === "ALL"
                ? "bg-amber-500 text-slate-950 shadow-md"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            <span>All Active</span>
            <span className="rounded-md bg-slate-950/40 px-1.5 py-0.5 text-[10px] font-black">
              {stats.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStage("NEW")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              filterStage === "NEW"
                ? "bg-blue-600 text-white shadow-md"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>New / Pending</span>
            <span className="rounded-md bg-slate-950/40 px-1.5 py-0.5 text-[10px] font-black">
              {stats.newCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStage("PREPARING")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              filterStage === "PREPARING"
                ? "bg-amber-600 text-white shadow-md"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            <Flame className="h-3.5 w-3.5" />
            <span>Cooking</span>
            <span className="rounded-md bg-slate-950/40 px-1.5 py-0.5 text-[10px] font-black">
              {stats.cooking}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStage("READY")}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              filterStage === "READY"
                ? "bg-emerald-600 text-white shadow-md"
                : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Ready for Pickup</span>
            <span className="rounded-md bg-slate-950/40 px-1.5 py-0.5 text-[10px] font-black">
              {stats.ready}
            </span>
          </button>
        </div>
      </div>

      {/* KOT Cards Display Grid */}
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
          <h3 className="text-base font-bold text-white">All Kitchen Orders Cleared!</h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm">
            Line stations are clear. Incoming orders from table QR codes or waiters will appear instantly.
          </p>
        </div>
      )}
    </div>
  );
}
