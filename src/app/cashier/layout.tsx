"use client";

import * as React from "react";
import { CashierNavigation } from "@/components/layout/CashierNavigation";
import { RoleGuard } from "@/components/common/RoleGuard";

export default function CashierLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["CASHIER", "MANAGER", "ADMIN", "SUPER_ADMIN"]}>
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <CashierNavigation />
        <main className="mx-auto max-w-7xl w-full px-4 sm:px-6 pt-6 pb-20 flex-1">
          {children}
        </main>
      </div>
    </RoleGuard>
  );
}
