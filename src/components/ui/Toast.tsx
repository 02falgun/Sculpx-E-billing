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
          success: <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />,
          error: <AlertCircle className="h-5 w-5 text-rose-500 shrink-0" />,
          warning: <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />,
          info: <Info className="h-5 w-5 text-blue-500 shrink-0" />,
        };

        const borderStyles = {
          success: "border-emerald-200 bg-white",
          error: "border-rose-200 bg-white",
          warning: "border-amber-200 bg-white",
          info: "border-blue-200 bg-white",
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-xl transition-all animate-in slide-in-from-bottom-2 ${borderStyles[toast.type]}`}
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
