"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore, usePOSStore, useUIStore } from "@/store";
import { useTables } from "@/hooks/useTables";
import { useOrders } from "@/hooks/useOrder";
import { useActiveKOTs } from "@/hooks/useKitchen";
import { TableCard } from "@/features/staff/TableCard";
import { Button } from "@/components/ui/Button";
import {
  BellRing,
  UtensilsCrossed,
  CheckCircle2,
  Clock,
  AlertCircle,
  Receipt,
  ArrowRight,
  Flame,
  User,
} from "lucide-react";

export default function WaiterDashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);
  const setSelectedTable = usePOSStore((s) => s.setSelectedTable);

  const { data: tables = [], isLoading: tablesLoading } = useTables();
  const { data: ordersRes } = useOrders();
  const { data: kots = [] } = useActiveKOTs();

  const orders = ordersRes?.data || [];

  // Attention Counts
  const activeTables = tables.filter((t) => t.status === "OCCUPIED" || t.status === "BILLED");
  const newOrders = orders.filter((o) => o.status === "PLACED" || o.status === "CONFIRMED");
  const readyKOTs = kots.filter((k) => k.status === "READY");
  const billingTables = tables.filter((t) => t.status === "BILLED");

  // Dynamic Time Greeting
  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const handleServeOrder = (tableNum: string) => {
    addToast({
      type: "success",
      title: `Table ${tableNum} Served`,
      message: "Order items marked as served to the table guests.",
    });
  };

  const handleTakeOrder = (table: (typeof tables)[0]) => {
    setSelectedTable(table);
    router.push("/staff/pos");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Shift Greeting & Operational Overview */}
      <div className="rounded-xl bg-black border border-neutral-800 text-white p-6 sm:p-7">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-1.5 w-1.5 rounded-full bg-white" />
              <span className="text-[10px] uppercase font-semibold tracking-widest text-neutral-400">
                Floor Station Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              {greeting}, {user?.name?.split(" ")[0] || "Rahul"}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 mt-1">
              <strong className="text-white">{activeTables.length} Active Tables</strong> •{" "}
              <strong className="text-white">{newOrders.length} New Orders</strong> •{" "}
              <strong className="text-white">{readyKOTs.length} Ready</strong> •{" "}
              <strong className="text-white">{billingTables.length} Payment Pending</strong>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/staff/pos">
              <Button
                variant="primary"
                size="md"
                className="bg-white text-black hover:bg-neutral-200 font-semibold"
                leftIcon={<UtensilsCrossed className="h-4 w-4" />}
              >
                Fast POS Order
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* NEEDS ATTENTION SECTION */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-neutral-100 text-neutral-800 border border-neutral-200">
              <BellRing className="h-3 w-3" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Needs Attention
            </h2>
          </div>
          <span className="text-xs text-neutral-500">
            {readyKOTs.length + billingTables.length + 1} Action Items
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card 1: Ready Orders */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded border border-neutral-200">
                  Order Ready
                </span>
                <span className="text-xs font-mono text-neutral-500">01:40 ago</span>
              </div>
              <h3 className="text-sm font-bold text-neutral-900 mt-2">
                Table 05 • Order Ready to Serve
              </h3>
              <p className="text-xs text-neutral-600 mt-1">
                2× Butter Chicken, 4× Garlic Naan expediting at Chef counter.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
              <Link href="/staff/tables" className="text-xs font-medium text-neutral-600 hover:text-black hover:underline">
                View Table 05
              </Link>
              <Button
                size="sm"
                variant="primary"
                onClick={() => handleServeOrder("05")}
                className="font-medium text-xs"
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              >
                Mark Served
              </Button>
            </div>
          </div>

          {/* Card 2: Payment Pending */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded border border-neutral-200">
                  Payment Pending
                </span>
                <span className="text-xs font-mono text-neutral-500">5 min wait</span>
              </div>
              <h3 className="text-sm font-bold text-neutral-900 mt-2">
                Table 03 • Payment Requested
              </h3>
              <p className="text-xs text-neutral-600 mt-1">
                Guests requested physical bill settlement. Amount: ₹1,240.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-900">Total: ₹1,240</span>
              <Link href="/cashier/bills/bill-1001">
                <Button
                  size="sm"
                  variant="outline"
                  className="font-medium text-xs"
                  leftIcon={<Receipt className="h-3.5 w-3.5" />}
                >
                  Settle Bill
                </Button>
              </Link>
            </div>
          </div>

          {/* Card 3: Assistance Request */}
          <div className="rounded-lg border border-neutral-200 bg-white p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded border border-neutral-200">
                  Service Requested
                </span>
                <span className="text-xs font-mono text-neutral-500">Just now</span>
              </div>
              <h3 className="text-sm font-bold text-neutral-900 mt-2">
                Table 08 • Customer Assistance
              </h3>
              <p className="text-xs text-neutral-600 mt-1">
                Guest tapped &ldquo;Call Waiter&rdquo; on mobile ordering screen.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between">
              <span className="text-xs text-neutral-500 font-medium">Indoor Garden</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => addToast({ type: "info", title: "Acknowledge Table 08", message: "Captain responding to Table 08" })}
                className="font-medium text-xs"
              >
                Acknowledge
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ACTIVE FLOOR TABLES */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Active Dining Tables
            </h2>
            <p className="text-xs text-neutral-500">Live occupancy and quick ticket actions</p>
          </div>
          <Link
            href="/staff/tables"
            className="text-xs font-medium text-neutral-700 hover:text-black flex items-center gap-1"
          >
            <span>View All Tables</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {tables.slice(0, 4).map((table) => (
            <TableCard key={table.id} table={table} />
          ))}
        </div>
      </div>
    </div>
  );
}
