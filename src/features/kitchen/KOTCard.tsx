"use client";

import * as React from "react";
import { KOT, KOTStatus } from "@/types";
import { useUpdateKOTStatus } from "@/hooks/useKitchen";
import { useUIStore } from "@/store";
import { KOTTimer } from "./KOTTimer";
import { QRContextBadge } from "@/components/shared";
import { Button } from "@/components/ui/Button";
import {
  Check,
  ChefHat,
  Flame,
  UtensilsCrossed,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

interface KOTCardProps {
  kot: KOT;
}

export function KOTCard({ kot }: KOTCardProps) {
  const { mutateAsync: updateStatus, isPending } = useUpdateKOTStatus();
  const addToast = useUIStore((s) => s.addToast);

  // Completed items toggle set
  const [completedItems, setCompletedItems] = React.useState<Record<string, boolean>>({});

  const toggleItem = (itemId: string) => {
    setCompletedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  const handleAdvanceStatus = async (nextStatus: KOTStatus) => {
    try {
      await updateStatus({
        id: kot.id,
        status: nextStatus,
      });

      addToast({
        type: "info",
        title: `KOT #${kot.kotNumber} Updated`,
        message: `Status moved to ${nextStatus}`,
      });
    } catch {
      addToast({
        type: "error",
        title: "Update Failed",
        message: "Failed to update kitchen ticket.",
      });
    }
  };

  return (
    <div
      className={`rounded-2xl border flex flex-col justify-between p-4 shadow-lg transition-all ${
        kot.status === "READY"
          ? "border-emerald-500/50 bg-slate-900 ring-2 ring-emerald-500/30"
          : kot.status === "PREPARING"
          ? "border-amber-500/50 bg-slate-900"
          : "border-slate-800 bg-slate-900"
      }`}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-black text-amber-400">
                #{kot.kotNumber}
              </span>
              <span className="text-[11px] font-bold text-slate-400">
                ({kot.orderNumber})
              </span>
            </div>
            <div className="mt-1">
              <QRContextBadge context={kot.qrContext} />
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <KOTTimer createdAt={kot.createdAt} />
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                kot.status === "READY"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : kot.status === "PREPARING"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : "bg-blue-500/20 text-blue-400 border border-blue-500/40"
              }`}
            >
              {kot.status}
            </span>
          </div>
        </div>

        {/* Special Notes banner if present */}
        {kot.specialNotes && (
          <div className="my-3 flex items-start gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
            <span className="font-semibold">{kot.specialNotes}</span>
          </div>
        )}

        {/* Items Checklist */}
        <div className="py-3 space-y-2.5">
          {kot.items.map((item) => {
            const isDone = !!completedItems[item.id];
            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`flex items-start gap-3 rounded-xl p-2.5 transition-colors cursor-pointer select-none ${
                  isDone
                    ? "bg-slate-950/60 text-slate-500 line-through opacity-60"
                    : "bg-slate-800/60 text-slate-100 hover:bg-slate-800"
                }`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border mt-0.5 transition-colors ${
                    isDone
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-600 bg-slate-900"
                  }`}
                >
                  {isDone && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-bold">
                      <span className="text-amber-400 mr-1.5">{item.quantity}x</span>
                      {item.name}
                    </span>
                  </div>

                  {item.modifiers && item.modifiers.length > 0 && (
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      + {item.modifiers.map((m) => m.name).join(", ")}
                    </p>
                  )}

                  {item.specialInstructions && (
                    <p className="text-[11px] text-amber-300 font-medium italic mt-0.5">
                      Note: “{item.specialInstructions}”
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Footer Button based on stage */}
      <div className="pt-3 border-t border-slate-800">
        {kot.status === "NEW" && (
          <Button
            type="button"
            variant="primary"
            size="md"
            isLoading={isPending}
            onClick={() => handleAdvanceStatus("ACCEPTED")}
            className="w-full font-bold bg-blue-600 hover:bg-blue-700"
            leftIcon={<ChefHat className="h-4 w-4" />}
          >
            Accept Ticket
          </Button>
        )}

        {kot.status === "ACCEPTED" && (
          <Button
            type="button"
            variant="primary"
            size="md"
            isLoading={isPending}
            onClick={() => handleAdvanceStatus("PREPARING")}
            className="w-full font-bold bg-amber-600 hover:bg-amber-700 shadow-md shadow-amber-600/30"
            leftIcon={<Flame className="h-4 w-4" />}
          >
            Start Cooking
          </Button>
        )}

        {kot.status === "PREPARING" && (
          <Button
            type="button"
            variant="primary"
            size="md"
            isLoading={isPending}
            onClick={() => handleAdvanceStatus("READY")}
            className="w-full font-bold bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/30"
            leftIcon={<UtensilsCrossed className="h-4 w-4" />}
          >
            Mark Ready to Serve
          </Button>
        )}

        {kot.status === "READY" && (
          <Button
            type="button"
            variant="outline"
            size="md"
            isLoading={isPending}
            onClick={() => handleAdvanceStatus("SERVED")}
            className="w-full font-bold border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            leftIcon={<CheckCircle2 className="h-4 w-4 text-emerald-400" />}
          >
            Expedite & Complete
          </Button>
        )}
      </div>
    </div>
  );
}
