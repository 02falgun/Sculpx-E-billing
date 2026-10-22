"use client";

import * as React from "react";
import { WaiterNavigation } from "@/components/layout/WaiterNavigation";
import { RoleGuard } from "@/components/common/RoleGuard";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["WAITER", "CAPTAIN", "MANAGER", "ADMIN", "SUPER_ADMIN"]}>
      <div className="min-h-screen bg-neutral-50 flex flex-col justify-between">
        <WaiterNavigation />
        <main className="mx-auto max-w-7xl w-full px-4 sm:px-6 pt-6 pb-20 flex-1">
          {children}
        </main>
      </div>
    </RoleGuard>
  );
}
