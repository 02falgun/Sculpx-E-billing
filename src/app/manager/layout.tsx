"use client";

import * as React from "react";
import { ManagerNavigation } from "@/components/layout/ManagerNavigation";
import { RoleGuard } from "@/components/common/RoleGuard";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["MANAGER", "ADMIN", "SUPER_ADMIN"]}>
      <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
        <ManagerNavigation />
        <main className="mx-auto max-w-7xl w-full px-4 sm:px-6 pt-6 pb-20 flex-1">
          {children}
        </main>
      </div>
    </RoleGuard>
  );
}
