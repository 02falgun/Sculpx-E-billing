import * as React from "react";
import { AdminSidebar } from "@/components/layout";
import { RoleGuard } from "@/components/common/RoleGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
      <div className="min-h-screen bg-neutral-50 flex">
        <div className="print:hidden">
          <AdminSidebar />
        </div>
        <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto overflow-x-hidden print:p-0 print:m-0 print:max-w-none">
          {children}
        </main>
      </div>
    </RoleGuard>
  );
}

