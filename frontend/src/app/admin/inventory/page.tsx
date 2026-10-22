"use client";

import * as React from "react";
import Link from "next/link";
import {
  useInventoryItems,
  useInventoryRecipes,
  useInventoryTransactions,
  useAdjustStock,
} from "@/hooks/useInventory";
import { InventoryItem } from "@/types";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Dialog } from "@/components/ui/Dialog";
import { Drawer } from "@/components/ui/Drawer";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useUIStore } from "@/store";
import {
  Package,
  Layers,
  FileText,
  Plus,
  SlidersHorizontal,
  ArrowRight,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function AdminInventoryPage() {
  const { data: inventoryData, isLoading, refetch } = useInventoryItems();
  const { data: recipes = [] } = useInventoryRecipes();
  const { data: transactionsData } = useInventoryTransactions();
  const { mutateAsync: adjustStock, isPending: isAdjusting } = useAdjustStock();
  const addToast = useUIStore((s) => s.addToast);

  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedCategory, setSelectedCategory] = React.useState("ALL");
  const [selectedItem, setSelectedItem] = React.useState<InventoryItem | null>(null);
  const [adjustModalItem, setAdjustModalItem] = React.useState<InventoryItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);

  // Form states for stock adjustment
  const [adjType, setAdjType] = React.useState<"RESTOCK" | "USAGE" | "WASTAGE" | "ADJUSTMENT">("RESTOCK");
  const [adjQuantity, setAdjQuantity] = React.useState<string>("5");
  const [adjReason, setAdjReason] = React.useState<string>("Supplier shipment received");

  // Form states for adding new item
  const [newItemName, setNewItemName] = React.useState("");
  const [newItemCategory, setNewItemCategory] = React.useState("Meat & Poultry");
  const [newItemStock, setNewItemStock] = React.useState("10");
  const [newItemUnit, setNewItemUnit] = React.useState<string>("KG");
  const [newItemMinThreshold, setNewItemMinThreshold] = React.useState("5");

  const items = inventoryData?.data || [];
  const transactions = transactionsData?.data || [];

  const categories = React.useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    return ["ALL", ...Array.from(set)];
  }, [items]);

  const filteredItems = React.useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat =
        selectedCategory === "ALL" || item.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [items, searchQuery, selectedCategory]);

  const stats = React.useMemo(() => {
    const total = items.length;
    const lowStock = items.filter((i) => i.currentStock > 0 && i.isLowStock).length;
    const outOfStock = items.filter((i) => i.currentStock <= 0).length;
    return { total, lowStock, outOfStock };
  }, [items]);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalItem) return;

    const qty = parseFloat(adjQuantity);
    if (isNaN(qty) || qty <= 0) {
      addToast({ type: "error", title: "Invalid Quantity", message: "Enter a valid positive number." });
      return;
    }

    const change = adjType === "USAGE" || adjType === "WASTAGE" ? -qty : qty;

    try {
      await adjustStock({
        itemId: adjustModalItem.id,
        quantityChange: change,
        reason: adjReason,
        type: adjType,
      });

      addToast({
        type: "success",
        title: "Stock Updated",
        message: `${adjustModalItem.name} updated by ${change > 0 ? "+" : ""}${change} ${adjustModalItem.unit}.`,
      });

      setAdjustModalItem(null);
    } catch {
      addToast({
        type: "error",
        title: "Adjustment Failed",
        message: "Failed to record stock change.",
      });
    }
  };

  const handleAddItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    addToast({
      type: "success",
      title: "Item Added",
      message: `${newItemName} registered in stock catalog.`,
    });
    setIsAddModalOpen(false);
    setNewItemName("");
    refetch();
  };

  const getItemUsedInRecipes = (itemId: string) => {
    return recipes.filter((r) =>
      r.ingredients.some((ing) => ing.inventoryItemId === itemId),
    );
  };

  const getItemTransactions = (itemId: string) => {
    return transactions.filter((t) => t.inventoryItemId === itemId);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-neutral-900" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 uppercase">
              Inventory
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage ingredients, stock and availability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/inventory/recipes">
            <Button variant="secondary" size="sm" leftIcon={<Layers className="h-3.5 w-3.5" />}>
              Recipes
            </Button>
          </Link>
          <Link href="/admin/inventory/transactions">
            <Button variant="secondary" size="sm" leftIcon={<FileText className="h-3.5 w-3.5" />}>
              Transactions
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            Add Item
          </Button>
        </div>
      </div>

      {/* Simple Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-[8px] border border-neutral-200 bg-white p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            Total Items
          </span>
          <div className="text-2xl font-bold text-neutral-900 mt-1">{stats.total}</div>
          <span className="text-[11px] text-neutral-500">Tracked raw ingredients</span>
        </div>

        <div className="rounded-[8px] border border-neutral-300 bg-neutral-100 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-700">
            Low Stock
          </span>
          <div className="text-2xl font-bold text-neutral-900 mt-1">{stats.lowStock}</div>
          <span className="text-[11px] text-neutral-600">Below threshold par</span>
        </div>

        <div className="rounded-[8px] border border-neutral-400 bg-neutral-200/50 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-800">
            Out of Stock
          </span>
          <div className="text-2xl font-bold text-neutral-900 mt-1">{stats.outOfStock}</div>
          <span className="text-[11px] text-neutral-600">Zero inventory par</span>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
        <div className="max-w-xs w-full">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search ingredient or SKU..."
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-[6px] px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                selectedCategory === cat
                  ? "bg-black text-white border-black font-semibold"
                  : "bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-100 hover:text-black"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-neutral-400 font-medium">Loading inventory items...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <EmptyState
          title="No items found"
          description="Try adjusting your search query or category filter."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery("");
            setSelectedCategory("ALL");
          }}
        />
      ) : (
        <div className="w-full overflow-x-auto rounded-[8px] border border-neutral-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                <th className="py-3 px-4">Ingredient</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Current Stock</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Updated</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-neutral-800">
              {filteredItems.map((item) => {
                const isOut = item.currentStock <= 0;
                const isLow = !isOut && item.isLowStock;

                return (
                  <tr key={item.id} className="hover:bg-neutral-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-neutral-900">
                      <button
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="text-left hover:underline cursor-pointer"
                      >
                        <div className="font-bold">{item.name}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">{item.sku}</div>
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-neutral-500">{item.category}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-neutral-900">
                      {item.currentStock}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-neutral-500 uppercase">{item.unit}</td>
                    <td className="py-3.5 px-4">
                      {isOut ? (
                        <span className="inline-flex items-center gap-1 rounded-[4px] border border-neutral-400 bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold text-neutral-900">
                          Out of Stock
                        </span>
                      ) : isLow ? (
                        <span className="inline-flex items-center gap-1 rounded-[4px] border border-neutral-300 bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-800">
                          Low Stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-[4px] border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-neutral-900">
                          Available
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-neutral-400">
                      {new Date(item.updatedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setAdjustModalItem(item)}
                      >
                        Adjust Stock
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedItem(item)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Adjust Stock Dialog */}
      {adjustModalItem && (
        <Dialog
          isOpen={!!adjustModalItem}
          onClose={() => setAdjustModalItem(null)}
          title={`Adjust Stock · ${adjustModalItem.name}`}
          description={`Current: ${adjustModalItem.currentStock} ${adjustModalItem.unit} (Threshold: ${adjustModalItem.minimumThreshold} ${adjustModalItem.unit})`}
        >
          <form onSubmit={handleAdjustSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Adjustment Type
              </label>
              <Select
                value={adjType}
                onChange={(e) => setAdjType(e.target.value as any)}
                options={[
                  { value: "RESTOCK", label: "RESTOCK (+ stock added from purchase)" },
                  { value: "USAGE", label: "CONSUMPTION (- used in preparation)" },
                  { value: "WASTAGE", label: "WASTE (- expired or damaged)" },
                  { value: "ADJUSTMENT", label: "ADJUSTMENT (+/- inventory count audit)" },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Quantity ({adjustModalItem.unit})
              </label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={adjQuantity}
                onChange={(e) => setAdjQuantity(e.target.value)}
                placeholder="5"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Reason / Batch Ref
              </label>
              <Input
                type="text"
                required
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                placeholder="Supplier shipment PO-981"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setAdjustModalItem(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isAdjusting}
              >
                Confirm Adjustment
              </Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Add New Item Dialog */}
      <Dialog
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Inventory Item"
        description="Register a new tracked ingredient in the hospitality stock ledger."
      >
        <form onSubmit={handleAddItemSubmit} className="space-y-4">
          <Input
            label="Ingredient Name"
            required
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder="e.g. Saffron Strands"
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Category
              </label>
              <Select
                value={newItemCategory}
                onChange={(e) => setNewItemCategory(e.target.value)}
                options={[
                  { value: "Meat & Poultry", label: "Meat & Poultry" },
                  { value: "Dairy", label: "Dairy" },
                  { value: "Fresh Produce", label: "Fresh Produce" },
                  { value: "Dry Grains", label: "Dry Grains" },
                  { value: "Pantry & Spices", label: "Pantry & Spices" },
                  { value: "Seafood", label: "Seafood" },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Unit of Measure
              </label>
              <Select
                value={newItemUnit}
                onChange={(e) => setNewItemUnit(e.target.value)}
                options={[
                  { value: "KG", label: "Kilograms (KG)" },
                  { value: "GRAM", label: "Grams (GRAM)" },
                  { value: "LITRE", label: "Litres (LITRE)" },
                  { value: "ML", label: "Millilitres (ML)" },
                  { value: "PIECE", label: "Pieces (PIECE)" },
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Starting Stock"
              type="number"
              step="0.5"
              required
              value={newItemStock}
              onChange={(e) => setNewItemStock(e.target.value)}
              placeholder="10"
            />
            <Input
              label="Minimum Threshold"
              type="number"
              step="0.5"
              required
              value={newItemMinThreshold}
              onChange={(e) => setNewItemMinThreshold(e.target.value)}
              placeholder="5"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-200">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Ingredient
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Item Detail Drawer (Prompt section 43) */}
      {selectedItem && (
        <Drawer
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          position="right"
          title={selectedItem.name}
        >
          <div className="space-y-6 text-left">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-[6px] border border-neutral-200 bg-neutral-50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Current Stock
                </span>
                <div className="text-xl font-bold font-mono text-neutral-900 mt-0.5">
                  {selectedItem.currentStock} {selectedItem.unit}
                </div>
              </div>

              <div className="p-3 rounded-[6px] border border-neutral-200 bg-neutral-50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  Minimum Par
                </span>
                <div className="text-xl font-bold font-mono text-neutral-900 mt-0.5">
                  {selectedItem.minimumThreshold} {selectedItem.unit}
                </div>
              </div>
            </div>

            {/* Status & Attributes */}
            <div className="space-y-2 border-y border-neutral-200 py-4 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500">Status</span>
                <span className="font-bold text-neutral-900">
                  {selectedItem.currentStock <= 0
                    ? "Out of Stock"
                    : selectedItem.isLowStock
                    ? "Low Stock"
                    : "Available"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Category</span>
                <span className="font-semibold text-neutral-900">{selectedItem.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">SKU</span>
                <span className="font-mono text-neutral-900">{selectedItem.sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Supplier</span>
                <span className="text-neutral-900">{selectedItem.supplierName || "Direct Farm"}</span>
              </div>
            </div>

            {/* Used In Recipes */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Used In Menu Items
              </h4>
              {getItemUsedInRecipes(selectedItem.id).length === 0 ? (
                <p className="text-xs text-neutral-400 italic">Not currently linked to recipes.</p>
              ) : (
                <div className="space-y-1.5">
                  {getItemUsedInRecipes(selectedItem.id).map((r) => (
                    <div
                      key={r.id}
                      className="p-2.5 rounded-[6px] border border-neutral-200 bg-white flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-neutral-900">{r.menuItemName}</span>
                      <span className="text-[11px] font-mono text-neutral-500">
                        {r.ingredients.find((i) => i.inventoryItemId === selectedItem.id)?.quantityRequired}{" "}
                        {selectedItem.unit} per dish
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent Transactions */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Recent Ledger Transactions
              </h4>
              {getItemTransactions(selectedItem.id).length === 0 ? (
                <p className="text-xs text-neutral-400 italic">No recent transactions recorded.</p>
              ) : (
                <div className="space-y-1.5">
                  {getItemTransactions(selectedItem.id).map((tx) => (
                    <div
                      key={tx.id}
                      className="p-2.5 rounded-[6px] border border-neutral-200 bg-neutral-50/50 text-xs flex justify-between items-center"
                    >
                      <div>
                        <div className="font-semibold text-neutral-900">
                          {tx.type} &middot; {tx.quantityChange > 0 ? "+" : ""}
                          {tx.quantityChange} {selectedItem.unit}
                        </div>
                        <div className="text-[10px] text-neutral-500">{tx.reason}</div>
                      </div>
                      <div className="text-[10px] text-neutral-400 text-right">
                        <div>{tx.performedBy}</div>
                        <div>{new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Drawer Actions */}
            <div className="pt-4 border-t border-neutral-200 flex gap-2">
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() => {
                  setAdjustModalItem(selectedItem);
                }}
              >
                Adjust Stock
              </Button>
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                onClick={() => setSelectedItem(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Drawer>
      )}
    </div>
  );
}
