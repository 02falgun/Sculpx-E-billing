import * as React from "react";
import { CustomerHeader } from "@/components/layout";

export default function BillLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-between">
      <div className="print:hidden">
        <CustomerHeader />
      </div>
      <main className="mx-auto max-w-4xl w-full px-4 sm:px-6 pt-6 pb-16 flex-1 print:p-0 print:m-0 print:max-w-none">
        {children}
      </main>
    </div>
  );
}
