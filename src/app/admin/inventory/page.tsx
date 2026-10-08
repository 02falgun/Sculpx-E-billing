"use client";

import * as React from "react";
import { Package, AlertTriangle, CheckCircle2, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AdminInventoryPage() {
  const stockItems = [
    { id: "inv-1", name: "Farm Fresh Butter", category: "Dairy", quantity: "18.5 kg", minLevel: "5 kg", status: "AVAILABLE" },
    { id: "inv-2", name: "Basmati Rice (Heritage)", category: "Grains", quantity: "42 kg", minLevel: "20 kg", status: "AVAILABLE" },
    { id: "inv-3", name: "Chicken Breasts (Fresh)", category: "Meat", quantity: "4.2 kg", minLevel: "8 kg", status: "LOW_STOCK" },
    { id: "inv-4", name: "Garlic & Ginger Paste", category: "Pantry", quantity: "12 kg", minLevel: "3 kg", status: "AVAILABLE" },
    { id: "inv-5", name: "Fresh Cream (35%)", category: "Dairy", quantity: "2.1 L", minLevel: "5 L", status: "LOW_STOCK" },
    { id: "inv-6", name: "Paneer (Cottage Cheese)", category: "Dairy", quantity: "14 kg", minLevel: "6 kg", status: "AVAILABLE" },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-slate-800" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Inventory &amp; Ingredient Stock
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Internal ingredient management, par levels, recipe deductions, and auto 86-soldout toggles.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <span className="text-xs text-slate-500 font-semibold">Tracked SKU Items</span>
          <div className="text-2xl font-black text-slate-900 mt-1">48 SKUs</div>
          <span className="text-[11px] text-emerald-600 font-medium">All suppliers verified</span>
        </div>

        <div className="bg-white rounded-2xl border border-amber-200 bg-amber-50/40 p-5">
          <span className="text-xs text-amber-800 font-semibold">Low Stock Warnings</span>
          <div className="text-2xl font-black text-amber-700 mt-1">2 Items</div>
          <span className="text-[11px] text-amber-700 font-medium">Re-order alerts dispatched</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <span className="text-xs text-slate-500 font-semibold">Inventory Valuation</span>
          <div className="text-2xl font-black text-slate-900 mt-1">₹84,200</div>
          <span className="text-[11px] text-slate-400">Current store inventory</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="pb-3">Item Name</th>
              <th className="pb-3">Category</th>
              <th className="pb-3">Current Stock</th>
              <th className="pb-3">Min Par Level</th>
              <th className="pb-3">Status</th>
              <th className="pb-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {stockItems.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50">
                <td className="py-3 font-bold text-slate-900">{item.name}</td>
                <td className="py-3 text-slate-500">{item.category}</td>
                <td className="py-3 font-mono font-bold text-slate-800">{item.quantity}</td>
                <td className="py-3 font-mono text-slate-400">{item.minLevel}</td>
                <td className="py-3">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.status === "AVAILABLE"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {item.status === "AVAILABLE" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <AlertTriangle className="h-3 w-3" />
                    )}
                    {item.status}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <Button size="sm" variant="outline" className="text-xs">
                    Update Par
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
