"use client";

import * as React from "react";
import { useActiveKOTs } from "@/hooks/useKitchen";
import { KitchenHeader } from "@/components/layout/KitchenHeader";
import { KDSBoard } from "@/features/kitchen/KDSBoard";

export default function KitchenPage() {
  const { data: kots = [] } = useActiveKOTs();

  return (
    <div className="flex flex-col min-h-screen">
      <KitchenHeader activeCount={kots.length} />
      <main className="p-4 sm:p-6 flex-1 w-full max-w-[1920px] mx-auto">
        <KDSBoard />
      </main>
    </div>
  );
}
