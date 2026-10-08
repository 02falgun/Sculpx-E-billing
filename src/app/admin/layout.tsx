import * as React from "react";
import { AdminSidebar } from "@/components/layout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <div className="print:hidden">
        <AdminSidebar />
      </div>
      <main className="flex-1 p-6 sm:p-8 max-w-7xl mx-auto overflow-x-hidden print:p-0 print:m-0 print:max-w-none">
        {children}
      </main>
    </div>
  );
}
