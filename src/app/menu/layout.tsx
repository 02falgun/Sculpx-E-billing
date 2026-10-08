import * as React from "react";
import { CustomerHeader, CustomerBottomNav } from "@/components/layout";

export default function CustomerMenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <CustomerHeader />
      <main className="mx-auto max-w-5xl w-full px-4 sm:px-6 pt-4 flex-1">
        {children}
      </main>
      <CustomerBottomNav />
    </div>
  );
}
