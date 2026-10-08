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
      className={`rounded-lg border flex flex-col justify-between p-4 transition-all ${
        kot.status === "READY"
          ? "border-neutral-600 bg-neutral-900"
          : kot.status === "PREPARING"
          ? "border-neutral-700 bg-neutral-900"
          : "border-neutral-800 bg-neutral-900"
      }`}
    >
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold tracking-tight text-white">
                #{kot.kotNumber}
              </span>
              <span className="text-xs font-mono text-neutral-400">
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
              className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                kot.status === "READY"
                  ? "bg-white text-black border border-white font-bold"
                  : kot.status === "PREPARING"
                  ? "bg-neutral-800 text-white border border-neutral-600"
                  : "bg-neutral-800 text-neutral-300 border border-neutral-700"
              }`}
            >
              {kot.status}
            </span>
          </div>
        </div>

        {/* Special Notes banner if present */}
        {kot.specialNotes && (
          <div className="my-3 flex items-start gap-1.5 rounded border border-neutral-700 bg-neutral-800/80 p-2 text-xs text-neutral-200">
            <AlertTriangle className="h-3.5 w-3.5 text-neutral-400 shrink-0 mt-0.5" />
            <span className="font-medium">{kot.specialNotes}</span>
          </div>
        )}

        {/* Items Checklist */}
        <div className="py-3 space-y-2">
          {kot.items.map((item) => {
            const isDone = !!completedItems[item.id];
            return (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`flex items-start gap-3 rounded-md p-2.5 transition-colors cursor-pointer select-none ${
                  isDone
                    ? "bg-black/40 text-neutral-500 line-through opacity-60"
                    : "bg-neutral-800/60 text-neutral-100 hover:bg-neutral-800"
                }`}
              >
                <div
                  className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border mt-0.5 transition-colors ${
                    isDone
                      ? "border-white bg-white text-black"
                      : "border-neutral-600 bg-neutral-900"
                  }`}
                >
                  {isDone && <Check className="h-3 w-3 stroke-[3]" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold">
                      <span className="text-neutral-400 mr-1.5">{item.quantity}x</span>
                      {item.name}
                    </span>
                  </div>

                  {item.modifiers && item.modifiers.length > 0 && (
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      + {item.modifiers.map((m) => m.name).join(", ")}
                    </p>
                  )}

                  {item.specialInstructions && (
                    <p className="text-[11px] text-neutral-400 font-medium italic mt-0.5">
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
      <div className="pt-3 border-t border-neutral-800">
        {kot.status === "NEW" && (
          <Button
            type="button"
            variant="primary"
            size="md"
            isLoading={isPending}
            onClick={() => handleAdvanceStatus("ACCEPTED")}
            className="w-full font-semibold bg-white text-black hover:bg-neutral-200"
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
            className="w-full font-semibold bg-white text-black hover:bg-neutral-200"
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
            className="w-full font-semibold bg-white text-black hover:bg-neutral-200"
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
            className="w-full font-semibold border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700"
            leftIcon={<CheckCircle2 className="h-4 w-4 text-white" />}
          >
            Expedite & Complete
          </Button>
        )}
      </div>
    </div>
  );
}
