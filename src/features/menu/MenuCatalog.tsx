"use client";

import * as React from "react";
import { QRContext, MenuItem } from "@/types";
import { useCategories, useMenuItems } from "@/hooks/useMenu";
import { useDebounce } from "@/hooks/useDebounce";
import { QRBanner } from "./QRBanner";
import { CategoryTabs } from "./CategoryTabs";
import { MenuSearchAndFilter, DietaryFilter } from "./MenuSearchAndFilter";
import { MenuItemCard } from "./MenuItemCard";
import { ModifierModal } from "./ModifierModal";
import { Skeleton } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { UtensilsCrossed } from "lucide-react";

export interface MenuCatalogProps {
  qrContext: QRContext;
}

export function MenuCatalog({ qrContext }: MenuCatalogProps) {
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [dietaryFilter, setDietaryFilter] = React.useState<DietaryFilter>("ALL");
  const [customizingItem, setCustomizingItem] = React.useState<MenuItem | null>(null);

  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data: categories = [], isLoading: isLoadingCategories } = useCategories();
  const {
    data: menuItems = [],
    isLoading: isLoadingItems,
    error,
  } = useMenuItems({
    categoryId: selectedCategoryId === "all" ? undefined : selectedCategoryId,
    search: debouncedSearch.trim() || undefined,
  });

  // Client-side dietary filtering
  const filteredItems = React.useMemo(() => {
    return menuItems.filter((item) => {
      if (dietaryFilter === "VEG") {
        return item.dietaryType === "VEG" || item.dietaryType === "VEGAN";
      }
      if (dietaryFilter === "NON_VEG") {
        return item.dietaryType === "NON_VEG" || item.dietaryType === "EGG";
      }
      if (dietaryFilter === "CHEF_SPECIAL") {
        return !!item.isChefSpecial;
      }
      return true;
    });
  }, [menuItems, dietaryFilter]);

  return (
    <div className="space-y-6 pb-24">
      {/* 1. Dynamic Table/Room QR Context Banner */}
      <QRBanner context={qrContext} />

      {/* 2. Instant Search and Dietary Quick-Filters */}
      <MenuSearchAndFilter
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        dietaryFilter={dietaryFilter}
        onDietaryFilterChange={setDietaryFilter}
      />

      {/* 3. Horizontal Sticky Category Navigation */}
      {isLoadingCategories ? (
        <div className="flex gap-2 py-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-24 rounded-full shrink-0" />
          ))}
        </div>
      ) : (
        <CategoryTabs
          categories={categories}
          activeCategoryId={selectedCategoryId}
          onSelectCategory={setSelectedCategoryId}
        />
      )}

      {/* 4. Menu Items Grid or Loading/Empty States */}
      {isLoadingItems ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <div className="flex justify-between items-center pt-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-20 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <EmptyState
          title="Unable to load menu"
          description="A network error occurred while retrieving dishes. Please try again."
        />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="h-6 w-6 text-slate-400" />}
          title="No dishes found"
          description="Try clearing your search query or dietary filters to browse all options."
          actionLabel="Reset Filters"
          onAction={() => {
            setSearchQuery("");
            setDietaryFilter("ALL");
            setSelectedCategoryId("all");
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              onOpenModifiers={(itemToCustomize) => setCustomizingItem(itemToCustomize)}
            />
          ))}
        </div>
      )}

      {/* 5. Modifier Customization Modal */}
      <ModifierModal
        item={customizingItem}
        isOpen={!!customizingItem}
        onClose={() => setCustomizingItem(null)}
      />
    </div>
  );
}
