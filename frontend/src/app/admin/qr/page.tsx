"use client";

import * as React from "react";
import { QRCodeGeneratorManager } from "@/features/admin";
import { QrCode } from "lucide-react";

export default function AdminQRPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 print:hidden">
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-amber-600" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            QR Tent Card Generator
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Export branded QR tent cards for restaurant dining tables and guestroom room service
        </p>
      </div>

      <QRCodeGeneratorManager />
    </div>
  );
}
