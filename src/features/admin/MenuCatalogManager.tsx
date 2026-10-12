"use client";

import * as React from "react";
import { MenuItem } from "@/types";
import { useCategories, useMenuItems } from "@/hooks/useMenu";
import { CurrencyDisplay, DietIndicator } from "@/components/shared";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useUIStore } from "@/store";
import { Sparkles, Utensils, Check, X } from "lucide-react";

export function MenuCatalogManager() {
  const { data: categories = [] } = useCategories();
  const { data: initialMenuItems = [], isLoading } = useMenuItems();
  const [menuItems, setMenuItems] = React.useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const addToast = useUIStore((s) => s.addToast);

  React.useEffect(() => {
    if (initialMenuItems.length > 0 && menuItems.length === 0) {
      setMenuItems(initialMenuItems);
    }
  }, [initialMenuItems, menuItems.length]);

  const toggleAvailability = (itemId: string) => {
    setMenuItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const nextVal = !item.isAvailable;
          addToast({
            type: nextVal ? "success" : "info",
            title: `Item Status Updated`,
            message: `${item.name} marked as ${nextVal ? "Available" : "86'd / Sold Out"}`,
          });
          return { ...item, isAvailable: nextVal };
        }
        return item;
      })
    );
  };

  const filteredItems = React.useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCat =
        selectedCategoryId === "all" || item.categoryId === selectedCategoryId;
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query);
      return matchesCat && matchesQuery;
    });
  }, [menuItems, selectedCategoryId, searchQuery]);

  if (isLoading && menuItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
        <Spinner size="lg" className="text-amber-500" />
        <p className="text-xs font-semibold text-slate-500">Loading catalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategoryId("all")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedCategoryId === "all"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            All Items ({menuItems.length})
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategoryId(c.id)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedCategoryId === c.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <SearchInput
            placeholder="Search dish or ingredient..."
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
          />
        </div>
      </div>

      {/* Menu Catalog Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3.5 pl-4 pr-3">Dish Details</th>
              <th className="py-3.5 px-3">Dietary</th>
              <th className="py-3.5 px-3">Base Price</th>
              <th className="py-3.5 px-3">Prep Time</th>
              <th className="py-3.5 px-3">Special Flags</th>
              <th className="py-3.5 pr-4 pl-3 text-right">Availability (86)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-500">
                  <Utensils className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-sm">
                    {menuItems.length === 0 ? "Your menu is empty. Add your first menu item." : "No dishes found matching your filter."}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {menuItems.length === 0
                      ? "Create categories and dishes to make them available for dining room and QR orders."
                      : "Try adjusting your search query or selected category."}
                  </p>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 pl-4 pr-3">
                    <div className="font-bold text-slate-900">{item.name}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-1 max-w-sm mt-0.5">
                      {item.description}
                    </div>
                  </td>

                  <td className="py-3.5 px-3">
                    <DietIndicator type={item.dietaryType} />
                  </td>

                  <td className="py-3.5 px-3">
                    <CurrencyDisplay amount={item.price} className="font-bold text-slate-900" />
                  </td>

                  <td className="py-3.5 px-3 text-slate-500">
                    ~{item.preparationTimeMinutes} mins
                  </td>

                  <td className="py-3.5 px-3">
                    {item.isChefSpecial && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                        <Sparkles className="h-3 w-3" /> Chef&apos;s Special
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 pr-4 pl-3 text-right">
                    <button
                      type="button"
                      onClick={() => toggleAvailability(item.id)}
                      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                        item.isAvailable
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                          : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                      }`}
                    >
                      {item.isAvailable ? (
                        <>
                          <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                          <span>In Stock</span>
                        </>
                      ) : (
                        <>
                          <X className="h-3.5 w-3.5 stroke-[2.5]" />
                          <span>Sold Out (86)</span>
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
