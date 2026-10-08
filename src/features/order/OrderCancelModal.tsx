"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useCancelOrder } from "@/hooks/useOrder";
import { useUIStore } from "@/store";
import { AlertCircle, AlertTriangle } from "lucide-react";

interface OrderCancelModalProps {
  orderId: string;
  orderNumber: string;
  isOpen: boolean;
  onClose: () => void;
}

const REASONS = [
  "Ordered incorrect items or quantities by mistake",
  "Wait time is too long",
  "Change of plans / Leaving restaurant",
  "Other reason",
];

export function OrderCancelModal({
  orderId,
  orderNumber,
  isOpen,
  onClose,
}: OrderCancelModalProps) {
  const [selectedReason, setSelectedReason] = React.useState(REASONS[0]);
  const [customNote, setCustomNote] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const { mutateAsync: cancelOrder, isPending } = useCancelOrder();
  const addToast = useUIStore((s) => s.addToast);

  const handleConfirmCancel = async () => {
    setErrorMessage(null);
    const finalReason =
      selectedReason === "Other reason" && customNote.trim()
        ? `Other: ${customNote.trim()}`
        : selectedReason;

    try {
      await cancelOrder({
        orderId,
        reason: finalReason,
      });

      addToast({
        type: "info",
        title: "Order Cancelled",
        message: `Order #${orderNumber} was cancelled.`,
      });

      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to cancel order at this stage.";
      setErrorMessage(msg);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Cancel Order Confirmation"
      description={`Are you sure you want to cancel Order #${orderNumber}?`}
      maxWidth="md"
    >
      <div className="space-y-4 pt-2">
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 flex items-start gap-2.5 text-xs text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
          <p>
            Orders can only be cancelled before kitchen preparation starts. If food is already cooking, please notify your floor waiter.
          </p>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-800 block mb-2">
            Please select a reason:
          </label>
          <div className="space-y-2">
            {REASONS.map((r) => (
              <label
                key={r}
                className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-xs cursor-pointer transition-colors ${
                  selectedReason === r
                    ? "border-rose-500 bg-rose-50/40 text-slate-900 font-medium"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="cancel-reason"
                  checked={selectedReason === r}
                  onChange={() => setSelectedReason(r)}
                  className="h-3.5 w-3.5 text-rose-600 focus:ring-rose-500"
                />
                <span>{r}</span>
              </label>
            ))}
          </div>
        </div>

        {selectedReason === "Other reason" && (
          <div>
            <textarea
              placeholder="Tell us what happened..."
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isPending}
          >
            Keep My Order
          </Button>

          <Button
            type="button"
            variant="danger"
            size="sm"
            isLoading={isPending}
            onClick={handleConfirmCancel}
          >
            Yes, Cancel Order
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
