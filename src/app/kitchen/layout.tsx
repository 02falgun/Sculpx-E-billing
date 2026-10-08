"use client";

import * as React from "react";
import { RoleGuard } from "@/components/common/RoleGuard";

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["KITCHEN_STAFF", "MANAGER", "ADMIN", "SUPER_ADMIN"]}>
      <div className="min-h-screen bg-black text-white flex flex-col justify-between">
        {children}
      </div>
    </RoleGuard>
  );
}
