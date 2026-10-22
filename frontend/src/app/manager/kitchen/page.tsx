"use client";

import * as React from "react";
import { KDSBoard } from "@/features/kitchen/KDSBoard";
import { ChefHat } from "lucide-react";

export default function ManagerKitchenPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex items-center gap-2">
          <ChefHat className="h-5 w-5 text-purple-600" />
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Kitchen Production Board
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Monitor active cook line tickets, overdue SLAs, and expedited pickup times.
        </p>
      </div>

      <div className="bg-slate-950 p-6 rounded-3xl">
        <KDSBoard />
      </div>
    </div>
  );
}
