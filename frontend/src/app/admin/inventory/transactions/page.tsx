"use client";

import * as React from "react";
import Link from "next/link";
import { useInventoryTransactions } from "@/hooks/useInventory";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ArrowLeft, FileText, Package } from "lucide-react";

export default function AdminTransactionsPage() {
  const { data: txData, isLoading } = useInventoryTransactions();
  const [filterType, setFilterType] = React.useState<string>("ALL");
  const [search, setSearch] = React.useState("");

  const transactions = txData?.data || [];

  const types = ["ALL", "RESTOCK", "USAGE", "WASTAGE", "ADJUSTMENT"];

  const filtered = React.useMemo(() => {
    return transactions.filter((t) => {
      const matchType = filterType === "ALL" || t.type === filterType;
      const matchSearch =
        search.trim() === "" ||
        t.inventoryItemName.toLowerCase().includes(search.toLowerCase()) ||
        (t.reason && t.reason.toLowerCase().includes(search.toLowerCase())) ||
        t.performedBy.toLowerCase().includes(search.toLowerCase());
      return matchType && matchSearch;
    });
  }, [transactions, filterType, search]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/inventory"
              className="text-neutral-400 hover:text-black transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 uppercase">
              Inventory Ledger Transactions
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Audit log of all stock purchases, kitchen consumption, wastage, and adjustments.
          </p>
        </div>

        <div>
          <Link href="/admin/inventory">
            <Button variant="secondary" size="sm" leftIcon={<Package className="h-3.5 w-3.5" />}>
              Back to Stock
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="max-w-xs w-full">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search ingredient, user, ref..."
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {types.map((tp) => (
            <button
              key={tp}
              type="button"
              onClick={() => setFilterType(tp)}
              className={`rounded-[6px] px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                filterType === tp
                  ? "bg-black text-white border-black font-semibold"
                  : "bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-100 hover:text-black"
              }`}
            >
              {tp}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-neutral-400">Loading ledger logs...</p>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No transactions found"
          description="Try adjusting your filter or search."
        />
      ) : (
        <div className="w-full overflow-x-auto rounded-[8px] border border-neutral-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Ingredient</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Quantity Change</th>
                <th className="py-3 px-4">Stock After</th>
                <th className="py-3 px-4">Reference / Reason</th>
                <th className="py-3 px-4 text-right">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-neutral-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                    {new Date(t.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-3 px-4 font-bold text-neutral-900">
                    {t.inventoryItemName}
                  </td>
                  <td className="py-3 px-4">
                    <span className="inline-flex rounded-[4px] border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-[10px] font-bold text-neutral-900">
                      {t.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold">
                    <span className={t.quantityChange > 0 ? "text-neutral-900" : "text-neutral-600"}>
                      {t.quantityChange > 0 ? `+${t.quantityChange}` : t.quantityChange}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-neutral-500">
                    {t.remainingStockAfter}
                  </td>
                  <td className="py-3 px-4 text-neutral-600 max-w-xs truncate">
                    {t.reason || t.referenceOrderId || "—"}
                  </td>
                  <td className="py-3 px-4 text-right font-medium text-neutral-700 whitespace-nowrap">
                    {t.performedBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
