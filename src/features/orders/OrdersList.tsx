"use client";

import * as React from "react";
import Link from "next/link";
import { Order, OrderStatus } from "@/types";
import { useOrders } from "@/hooks/useOrder";
import { useOrderUpdates } from "@/hooks/useWebSocket";
import { StatusBadge, QRContextBadge, CurrencyDisplay } from "@/components/shared";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  FileText,
  ExternalLink,
  UtensilsCrossed,
  Clock,
  Sparkles,
} from "lucide-react";

export function OrdersList() {
  const [selectedStatus, setSelectedStatus] = React.useState<OrderStatus | "ALL">("ALL");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  const { data: orderData, isLoading, refetch } = useOrders({
    status: selectedStatus === "ALL" ? undefined : selectedStatus,
  });

  useOrderUpdates();

  const orders = orderData?.data || [];

  const filteredOrders = React.useMemo(() => {
    return orders.filter((o) => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        o.orderNumber.toLowerCase().includes(query) ||
        o.qrContext.displayName.toLowerCase().includes(query) ||
        (o.customerName && o.customerName.toLowerCase().includes(query))
      );
    });
  }, [orders, searchQuery]);

  const tabs: { label: string; value: OrderStatus | "ALL" }[] = [
    { label: "All Orders", value: "ALL" },
    { label: "Preparing", value: "PREPARING" },
    { label: "Food Ready", value: "READY" },
    { label: "Served", value: "SERVED" },
    { label: "Cancelled", value: "CANCELLED" },
  ];

  return (
    <div className="space-y-6">
      {/* Top Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {tabs.map((tab) => {
            const isSelected = selectedStatus === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setSelectedStatus(tab.value)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="w-full sm:w-64">
          <SearchInput
            placeholder="Search order #, table..."
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
          />
        </div>
      </div>

      {/* Orders List / Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
          <Spinner size="lg" className="text-amber-500" />
          <p className="text-xs font-semibold text-slate-500">Loading active orders...</p>
        </div>
      ) : filteredOrders.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 pl-4 pr-3">Order Number</th>
                <th className="py-3.5 px-3">Dining Context</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3">Dishes</th>
                <th className="py-3.5 px-3">Total</th>
                <th className="py-3.5 px-3">Source</th>
                <th className="py-3.5 pr-4 pl-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.map((order) => {
                const totalItems = order.items.reduce((acc, i) => acc + i.quantity, 0);
                const itemsSummary = order.items.map((i) => `${i.quantity}x ${i.name}`).join(", ");

                return (
                  <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 pl-4 pr-3">
                      <div className="font-bold text-slate-900">#{order.orderNumber}</div>
                      {order.customerName && (
                        <div className="text-[11px] text-slate-500">Guest: {order.customerName}</div>
                      )}
                    </td>

                    <td className="py-3.5 px-3">
                      <QRContextBadge context={order.qrContext} />
                    </td>

                    <td className="py-3.5 px-3">
                      <StatusBadge status={order.status} />
                    </td>

                    <td className="py-3.5 px-3 max-w-xs">
                      <span className="font-semibold text-slate-800">{totalItems} items</span>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5" title={itemsSummary}>
                        {itemsSummary}
                      </p>
                    </td>

                    <td className="py-3.5 px-3">
                      <CurrencyDisplay amount={order.grandTotal} className="font-black text-slate-900" />
                    </td>

                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          order.source === "STAFF_POS"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {order.source === "STAFF_POS" ? "Staff POS" : "Customer QR"}
                      </span>
                    </td>

                    <td className="py-3.5 pr-4 pl-3 text-right">
                      <Link href={`/order/${order.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs font-semibold"
                          rightIcon={<ExternalLink className="h-3.5 w-3.5" />}
                        >
                          Track
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="No Orders Found"
          description="There are currently no orders matching your selected filter."
          actionLabel="View All Orders"
          onAction={() => {
            setSelectedStatus("ALL");
            setSearchQuery("");
          }}
        />
      )}
    </div>
  );
}
