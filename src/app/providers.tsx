"use client";

import * as React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query-client";
import { CartDrawer } from "@/features/cart/CartDrawer";
import { ToastContainer } from "@/components/ui/Toast";
import { PWARegister } from "@/components/common/PWARegister";

export function AppProviders({ children }: { children: React.ReactNode }) {
  // QueryClient initialized once per client session
  const [queryClient] = React.useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <CartDrawer />
      <ToastContainer />
      <PWARegister />
    </QueryClientProvider>
  );
}
