"use client";

import * as React from "react";
import { PrinterFleetManager } from "@/features/admin";
import { Printer } from "lucide-react";

export default function AdminPrintersPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <Printer className="h-5 w-5 text-amber-600" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Thermal Printer Fleet
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Monitor kitchen station & billing counter hardware status, paper levels, and diagnostic jobs
        </p>
      </div>

      <PrinterFleetManager />
    </div>
  );
}
