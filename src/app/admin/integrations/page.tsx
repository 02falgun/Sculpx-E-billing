"use client";

import * as React from "react";
import { Sliders, Key, Webhook, Printer, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function AdminIntegrationsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <Sliders className="h-5 w-5 text-rose-700" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            System Integrations &amp; Hardware Status
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Live connection statuses for real-time WebSockets, digital invoices, and hardware printers.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* WebSockets */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Webhook className="h-4 w-4 text-emerald-600" />
              <span>Real-Time Sync Bus</span>
            </h3>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full">
              ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-500">
            WebSocket bus syncing orders, table occupancy, and kitchen KDS tickets in real time.
          </p>
          <div className="p-2.5 rounded-xl bg-slate-50 text-xs font-mono text-slate-700">
            /events channel
          </div>
        </div>

        {/* Digital Billing */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Key className="h-4 w-4 text-emerald-600" />
              <span>Digital Billing &amp; UPI</span>
            </h3>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full">
              ENABLED
            </span>
          </div>
          <p className="text-xs text-slate-500">
            In-app digital bill generation, itemized tax calculation, and manual cash/card/UPI settlement.
          </p>
          <div className="p-2.5 rounded-xl bg-slate-50 text-xs font-mono text-slate-700">
            Standard V1 Settlement Mode
          </div>
        </div>

        {/* Physical Thermal Printing */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Printer className="h-4 w-4 text-slate-500" />
              <span>Physical Thermal Printing</span>
            </h3>
            <span className="text-[10px] bg-slate-100 text-slate-600 border border-slate-200 font-bold px-2 py-0.5 rounded-full">
              NOT CONFIGURED
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Physical ESC/POS printing is out of scope for the V1 pilot. All kitchen tickets and guest bills are viewed digitally.
          </p>
          <div className="p-2.5 rounded-xl bg-slate-50 text-xs font-mono text-slate-500">
            Digital KDS Active (Printerless)
          </div>
        </div>
      </div>
    </div>
  );
}
