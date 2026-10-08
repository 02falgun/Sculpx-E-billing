"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  position?: "bottom" | "right";
}

export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  position = "bottom",
}: DrawerProps) {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={cn(
          "fixed z-10 bg-white shadow-xl transition-all duration-300 ease-out border-neutral-200",
          position === "bottom" &&
            "inset-x-0 bottom-0 max-h-[90vh] rounded-t-xl border-t p-6 overflow-y-auto animate-in slide-in-from-bottom",
          position === "right" &&
            "inset-y-0 right-0 w-full max-w-md border-l p-6 overflow-y-auto animate-in slide-in-from-right",
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile handle indicator */}
        {position === "bottom" && (
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-neutral-300" />
        )}

        <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
          {title ? (
            <h2 className="text-base font-bold text-neutral-900">{title}</h2>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="rounded-[4px] p-1 text-neutral-400 hover:bg-neutral-100 hover:text-black transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
