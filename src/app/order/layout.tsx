import * as React from "react";
import { CustomerHeader } from "@/components/layout";

export default function OrderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <CustomerHeader />
      <main className="mx-auto max-w-4xl w-full px-4 sm:px-6 pt-6 pb-16 flex-1">
        {children}
      </main>
    </div>
  );
}
