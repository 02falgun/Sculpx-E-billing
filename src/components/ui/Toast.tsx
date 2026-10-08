"use client";

import * as React from "react";
import { useUIStore } from "@/store";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export function ToastContainer() {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none p-4"
    >
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="h-4 w-4 text-neutral-900 shrink-0" />,
          error: <AlertCircle className="h-4 w-4 text-neutral-900 shrink-0" />,
          warning: <AlertTriangle className="h-4 w-4 text-neutral-700 shrink-0" />,
          info: <Info className="h-4 w-4 text-neutral-600 shrink-0" />,
        };

        const borderStyles = {
          success: "border-neutral-300 bg-white",
          error: "border-neutral-400 bg-white",
          warning: "border-neutral-300 bg-white",
          info: "border-neutral-200 bg-white",
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2.5 rounded-[8px] border p-3 shadow-md transition-all animate-in slide-in-from-bottom-2 ${borderStyles[toast.type]}`}
          >
            {icons[toast.type]}
            <div className="flex-1 text-left">
              {toast.title && (
                <h5 className="text-xs font-bold text-slate-900">{toast.title}</h5>
              )}
              <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                {toast.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
