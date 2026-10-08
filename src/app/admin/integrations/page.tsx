"use client";

import * as React from "react";
import { Sliders, Key, Webhook, Server, CheckCircle2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AdminIntegrationsPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <Sliders className="h-5 w-5 text-rose-700" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            System Integrations &amp; API Gateways
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Super Admin configuration for Payment Gateways (Razorpay/Stripe), ESC/POS Thermal Printers, and WebSockets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Webhook className="h-4 w-4 text-emerald-600" />
              <span>Real-Time WebSocket Sync Engine</span>
            </h3>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full">
              CONNECTED
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Bidirectional WebSocket bus syncing orders between Customer mobile, Waiter POS, and Kitchen KDS displays.
          </p>
          <div className="p-2.5 rounded-xl bg-slate-50 text-xs font-mono text-slate-700">
            ws://api.grandpalace.internal:8080/events
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Key className="h-4 w-4 text-emerald-600" />
              <span>Payment Gateway UPI Switch</span>
            </h3>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2 py-0.5 rounded-full">
              LIVE (TEST MODE)
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Dynamic UPI QR generation with auto-reconciliation and instant bill settlement callbacks.
          </p>
          <div className="p-2.5 rounded-xl bg-slate-50 text-xs font-mono text-slate-700">
            rzp_live_2026_sculpx_hospitality
          </div>
        </div>
      </div>
    </div>
  );
}
