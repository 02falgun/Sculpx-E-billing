"use client";

import * as React from "react";
import { AdminSidebar, LocationSelector, UserWorkspaceMenu } from "@/components/layout";
import { RoleGuard } from "@/components/common/RoleGuard";
import { Drawer } from "@/components/ui/Drawer";
import { Menu } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileDrawerOpen, setMobileDrawerOpen] = React.useState(false);

  return (
    <RoleGuard allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
      <div className="min-h-screen bg-neutral-50 flex">
        {/* Desktop Sidebar (Persistent, hidden on mobile/tablet) */}
        <div className="print:hidden">
          <AdminSidebar />
        </div>

        {/* Mobile Navigation Drawer */}
        <Drawer
          isOpen={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          position="left"
          title={
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-black text-white font-bold text-xs">
                S
              </div>
              <span className="text-xs font-bold uppercase tracking-tight text-neutral-900">
                SCULPX Admin
              </span>
            </div>
          }
        >
          <AdminSidebar isMobile onNavigate={() => setMobileDrawerOpen(false)} />
        </Drawer>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b border-neutral-200 bg-white px-4 sm:px-6 lg:px-8 flex items-center justify-between print:hidden sticky top-0 z-30">
            <div className="flex items-center gap-3">
              {/* Mobile Hamburger Menu Toggle */}
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(true)}
                aria-label="Open administration navigation drawer"
                className="lg:hidden flex h-8 w-8 items-center justify-center rounded-[6px] border border-neutral-300 text-neutral-700 hover:bg-neutral-100 hover:text-black transition-colors cursor-pointer"
              >
                <Menu className="h-4 w-4" />
              </button>

              <div className="flex items-center gap-2">
                <div className="lg:hidden flex h-6 w-6 items-center justify-center rounded-[4px] bg-black text-white font-bold text-[10px]">
                  S
                </div>
                <span className="text-xs font-bold text-neutral-900 uppercase tracking-tight hidden sm:inline">
                  SCULPX
                </span>
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider truncate max-w-[120px] sm:max-w-none">
                  Operational Scope
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <LocationSelector />
              <div className="lg:hidden">
                <UserWorkspaceMenu theme="light" />
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden print:p-0 print:m-0 print:max-w-none">
            {children}
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}

