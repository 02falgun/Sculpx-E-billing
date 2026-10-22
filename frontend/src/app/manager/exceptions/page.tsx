"use client";

import * as React from "react";
import Link from "next/link";
import { usePrinters } from "@/hooks/usePrinters";
import { useActiveKOTs } from "@/hooks/useKitchen";
import { useAllBills } from "@/hooks/useBilling";
import { useOrders } from "@/hooks/useOrder";
import { useUIStore } from "@/store";
import { Button } from "@/components/ui/Button";
import {
  AlertTriangle,
  Printer,
  Clock,
  Receipt,
  XCircle,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";

export default function ManagerExceptionsPage() {
  const { data: printers = [] } = usePrinters();
  const { data: kots = [] } = useActiveKOTs();
  const { data: billsRes } = useAllBills();
  const { data: ordersRes } = useOrders();
  const addToast = useUIStore((s) => s.addToast);

  const bills = billsRes?.data || [];
  const orders = ordersRes?.data || [];

  const offlinePrinters = printers.filter((p) => p.status === "OFFLINE");
  const preparingKots = kots.filter((k) => k.status === "PREPARING");
  const unpaidBills = bills.filter((b) => b.dueAmount > 0);
  const cancelledOrders = orders.filter((o) => o.status === "CANCELLED");

  interface DynamicException {
    id: string;
    category: "HARDWARE" | "KITCHEN" | "BILLING" | "AUDIT";
    title: string;
    detail: string;
    severity: "HIGH" | "MEDIUM" | "LOW";
    link: string;
    actionLabel: string;
  }

  const exceptions: DynamicException[] = [];

  offlinePrinters.forEach((p) => {
    exceptions.push({
      id: `printer-${p.id}`,
      category: "HARDWARE",
      title: `Printer Offline: ${p.name}`,
      detail: `IP: ${p.ipAddress || "Unassigned"} • Port: ${p.port || 9100}. Printer is not responding to heartbeat.`,
      severity: "HIGH",
      link: "/admin/printers",
      actionLabel: "Manage Hardware",
    });
  });

  if (preparingKots.length > 0) {
    exceptions.push({
      id: "kitchen-preparing",
      category: "KITCHEN",
      title: `${preparingKots.length} Active KOT${preparingKots.length > 1 ? "s" : ""} in Kitchen`,
      detail: `Tickets currently on active cook stations awaiting preparation and expediting.`,
      severity: "MEDIUM",
      link: "/kitchen",
      actionLabel: "Inspect KDS",
    });
  }

  unpaidBills.forEach((b) => {
    exceptions.push({
      id: `bill-${b.id}`,
      category: "BILLING",
      title: `Unpaid Check #${b.billNumber}`,
      detail: `Order #${b.orderNumber} • Due: ₹${b.dueAmount.toLocaleString("en-IN")}. Awaiting cashier settlement.`,
      severity: "HIGH",
      link: `/cashier/bills/${b.id}`,
      actionLabel: "Collect Payment",
    });
  });

  cancelledOrders.forEach((o) => {
    exceptions.push({
      id: `order-${o.id}`,
      category: "AUDIT",
      title: `Voided Order #${o.orderNumber}`,
      detail: `Order marked as CANCELLED. Inventory and audit records preserved in log.`,
      severity: "LOW",
      link: "/manager",
      actionLabel: "Audit Detail",
    });
  });

  const handleAction = (title: string) => {
    addToast({
      type: "info",
      title: "Action Initiated",
      message: `Navigating to address: ${title}`,
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/manager">
              <button
                type="button"
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 mr-1"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            </Link>
            <AlertTriangle className="h-5 w-5 text-purple-600" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Operational Exceptions Desk
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Urgent operational bottlenecks, hardware interruptions, kitchen ticket delays, and unsettled billing checks.
          </p>
        </div>

        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
          {exceptions.length} Active {exceptions.length === 1 ? "Item" : "Items"}
        </span>
      </div>

      {exceptions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mx-auto border border-emerald-100">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Operations Running Cleanly
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No active operational bottlenecks, hardware interruptions, or overdue guest bills detected at this moment.
          </p>
          <div className="pt-2">
            <Link href="/manager">
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back to Floor Overview
              </Button>
            </Link>
          </div>
        </div>
      ) : (
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
                </div>
                <h3 className="text-sm font-black text-slate-900">{exc.title}</h3>
                <p className="text-xs text-slate-600 max-w-2xl">{exc.detail}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link href={exc.link}>
                  <Button
                    variant={exc.severity === "HIGH" ? "primary" : "outline"}
                    size="sm"
                    onClick={() => handleAction(exc.title)}
                    className={`text-xs font-bold ${
                      exc.severity === "HIGH"
                        ? "bg-slate-900 hover:bg-slate-800 text-white"
                        : "border-slate-300"
                    }`}
                    rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                  >
                    {exc.actionLabel}
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
