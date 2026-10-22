"use client";

import * as React from "react";
import { MenuCatalogManager } from "@/features/admin";
import { Utensils } from "lucide-react";

export default function AdminMenuPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-amber-600" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Menu Catalogue & Pricing
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Configure dish pricing, dietary certifications, chef specials, and 86 stock availability
        </p>
      </div>

      <MenuCatalogManager />
    </div>
  );
}
