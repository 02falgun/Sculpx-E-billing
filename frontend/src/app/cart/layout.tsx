import * as React from "react";
import { CustomerHeader } from "@/components/layout";

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col justify-between">
      <CustomerHeader />
      <main className="mx-auto max-w-5xl w-full px-4 sm:px-6 pt-6 flex-1">{children}</main>
    </div>
  );
}
