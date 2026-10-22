"use client";

import * as React from "react";
import Link from "next/link";
import { useInventoryRecipes } from "@/hooks/useInventory";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ArrowLeft, Layers, Package, Plus } from "lucide-react";

export default function AdminRecipesPage() {
  const { data: recipes = [], isLoading } = useInventoryRecipes();

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
              Recipe Ingredient Formulas
            </h1>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Defines Menu Item &rarr; Recipe &rarr; Raw Ingredient automated depletion link.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/admin/inventory">
            <Button variant="secondary" size="sm" leftIcon={<Package className="h-3.5 w-3.5" />}>
              Back to Stock
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={() => alert("Recipe composition builder will connect in production database.")}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
          >
            New Recipe
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Spinner size="lg" />
          <p className="text-xs text-neutral-400">Loading recipe bills of material...</p>
        </div>
      ) : recipes.length === 0 ? (
        <EmptyState
          title="No recipes configured"
          description="Create your first recipe mapping menu items to raw inventory ingredients."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="rounded-[8px] border border-neutral-200 bg-white p-5 space-y-4 shadow-none"
            >
              <div className="border-b border-neutral-100 pb-3 flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">{recipe.menuItemName}</h3>
                  <span className="text-[10px] font-mono text-neutral-400">
                    ID: {recipe.menuItemId}
                  </span>
                </div>
                <span className="rounded-[4px] border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-mono text-neutral-600">
                  {recipe.ingredients.length} parts
                </span>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                  Required Ingredients per portion
                </span>
                <div className="space-y-1.5 divide-y divide-neutral-100">
                  {recipe.ingredients.map((ing, idx) => (
                    <div
                      key={idx}
                      className="pt-1.5 first:pt-0 flex items-center justify-between text-xs"
                    >
                      <span className="text-neutral-700 font-medium">
                        {ing.inventoryItemName}
                      </span>
                      <span className="font-mono font-bold text-neutral-900">
                        {ing.quantityRequired} {ing.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-100 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => alert(`Edit recipe formula for ${recipe.menuItemName}`)}
                >
                  Edit Formula
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
