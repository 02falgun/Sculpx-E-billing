import * as React from "react";
import { AdminSidebar, LocationSelector } from "@/components/layout";
import { RoleGuard } from "@/components/common/RoleGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
      <div className="min-h-screen bg-neutral-50 flex">
        <div className="print:hidden">
          <AdminSidebar />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-neutral-200 bg-white px-6 sm:px-8 flex items-center justify-between print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                Operational Scope
              </span>
            </div>
            <div className="flex items-center gap-4">
              <LocationSelector />
            </div>
          </header>
          <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto w-full overflow-x-hidden print:p-0 print:m-0 print:max-w-none">
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}

