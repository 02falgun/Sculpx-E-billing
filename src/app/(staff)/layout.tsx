"use client";

import * as React from "react";
import { StaffNavigation } from "@/components/layout";
import { useAuthStore } from "@/store";
import { MOCK_USERS } from "@/mocks/mockDb";

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const setSession = useAuthStore((s) => s.setSession);

  // Auto-initialize demo staff session if not signed in
  React.useEffect(() => {
    if (!user) {
      const defaultStaff = MOCK_USERS.find((u) => u.role === "WAITER") || MOCK_USERS[0];
      setSession({
        token: "demo-staff-jwt-token",
        user: defaultStaff,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  }, [user, setSession]);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      <StaffNavigation />
      <main className="mx-auto max-w-7xl w-full px-4 sm:px-6 pt-6 pb-16 flex-1">
        {children}
      </main>
    </div>
  );
}
