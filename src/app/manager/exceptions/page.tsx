"use client";

import * as React from "react";
import Link from "next/link";
import { useUIStore } from "@/store";
import { Button } from "@/components/ui/Button";
import {
  AlertTriangle,
  Printer,
  Clock,
  Receipt,
  XCircle,
  RefreshCw,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

export default function ManagerExceptionsPage() {
  const addToast = useUIStore((s) => s.addToast);

  const exceptions = [
    {
      id: "exc-1",
      category: "HARDWARE",
      title: "Reception Thermal Printer Disconnected",
      detail: "Hardware heartbeat missing for 8 minutes. 3 guest invoices held in local spooler.",
      severity: "HIGH",
      timestamp: "08 min ago",
      actionLabel: "Test Print & Reconnect",
    },
    {
      id: "exc-2",
      category: "KITCHEN",
      title: "Table 04 KOT Exceeded 20m Cooking SLA",
      detail: "Ticket #1042 containing Continental Platters has elapsed 22 minutes on the grill station.",
      severity: "MEDIUM",
      timestamp: "14 min ago",
      actionLabel: "Expedite Ticket",
    },
    {
      id: "exc-3",
      category: "BILLING",
      title: "Room 301 Card Payment Timeout",
      detail: "Guest terminal timed out waiting for bank confirmation. Bill balance remaining: ₹2,480.",
      severity: "HIGH",
      timestamp: "21 min ago",
      actionLabel: "Retry Gateway Charge",
    },
    {
      id: "exc-4",
      category: "AUDIT",
      title: "Order #ORD-2026-1019 Cancellation Override",
      detail: "Waitstaff initiated cancellation after order fire. Stock auto-restored. Reason: Guest flight departure.",
      severity: "LOW",
      timestamp: "45 min ago",
      actionLabel: "Acknowledge Void",
    },
  ];

  const handleResolve = (title: string) => {
    addToast({
      type: "success",
      title: "Exception Resolved",
      message: `${title} marked as addressed.`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-purple-600" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Operational Exceptions Desk
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Urgent operational bottlenecks, hardware interruptions, kitchen SLA delays, and billing anomalies.
        </p>
      </div>

      <div className="space-y-3">
        {exceptions.map((exc) => (
          <div
            key={exc.id}
            className={`rounded-2xl border p-5 bg-white shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all ${
              exc.severity === "HIGH"
                ? "border-rose-300 ring-1 ring-rose-200"
                : exc.severity === "MEDIUM"
                ? "border-amber-300 ring-1 ring-amber-200"
                : "border-slate-200"
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    exc.severity === "HIGH"
                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                      : exc.severity === "MEDIUM"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {exc.category} • {exc.severity} PRIORITY
                </span>
                <span className="text-xs text-slate-400 font-mono">{exc.timestamp}</span>
              </div>
              <h3 className="text-sm font-black text-slate-900">{exc.title}</h3>
              <p className="text-xs text-slate-600 max-w-2xl">{exc.detail}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant={exc.severity === "HIGH" ? "primary" : "outline"}
                size="sm"
                onClick={() => handleResolve(exc.title)}
                className={`text-xs font-bold ${
                  exc.severity === "HIGH"
                    ? "bg-slate-900 hover:bg-slate-800"
                    : "border-slate-300"
                }`}
              >
                {exc.actionLabel}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
