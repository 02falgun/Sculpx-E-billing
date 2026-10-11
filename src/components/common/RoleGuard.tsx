"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import { Role } from "@/types";
import { canAccess, getDefaultRouteForRole, getRoleDisplayName } from "@/utils/auth";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { ShieldAlert, ArrowRight, LogIn } from "lucide-react";

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [checking, setChecking] = React.useState(true);
  const [hasHydrated, setHasHydrated] = React.useState(
    () => useAuthStore.persist?.hasHydrated?.() ?? false
  );

  React.useEffect(() => {
    const unsub = useAuthStore.persist?.onFinishHydration?.(() => {
      setHasHydrated(true);
    });
    if (useAuthStore.persist?.hasHydrated?.()) {
      setHasHydrated(true);
    }
    return () => {
      unsub?.();
    };
  }, []);

  React.useEffect(() => {
    // If route is public customer route, allow immediately
    if (
      pathname.startsWith("/menu") ||
      pathname.startsWith("/cart") ||
      pathname.startsWith("/checkout") ||
      pathname.startsWith("/order") ||
      pathname.startsWith("/bill") ||
      pathname === "/" ||
      pathname === "/login"
    ) {
      setChecking(false);
      return;
    }

    // Wait for store to finish rehydration from localStorage
    if (!hasHydrated) {
      return;
    }

    if (!isAuthenticated || !user) {
      if (typeof window !== "undefined") {
        try {
          const raw = window.localStorage.getItem("restro_staff_auth");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.state?.user && parsed?.state?.isAuthenticated) {
              // Persisted state exists; trigger rehydration and do not redirect
              useAuthStore.persist?.rehydrate?.();
              return;
            }
          }
        } catch {}
      }

      // Truly unauthenticated, redirect to login
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== "SUPER_ADMIN") {
      // Allowed roles specified and user role not matched
      setChecking(false);
      return;
    }

    if (!canAccess(user, pathname)) {
      setChecking(false);
      return;
    }

    setChecking(false);
  }, [pathname, isAuthenticated, user, allowedRoles, router, hasHydrated]);

  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" className="text-neutral-900" />
        <p className="text-xs font-semibold text-neutral-400">Verifying station authorization...</p>
      </div>
    );
  }

  // If user is not authorized for this specific workspace
  if (
    allowedRoles &&
    user &&
    !allowedRoles.includes(user.role) &&
    user.role !== "SUPER_ADMIN"
  ) {
    const userDefault = getDefaultRouteForRole(user.role);

    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-[8px] border border-neutral-300 bg-white p-6 text-center space-y-4">
          <div className="h-10 w-10 rounded-[6px] bg-neutral-100 text-neutral-900 flex items-center justify-center mx-auto border border-neutral-300">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900">Restricted Station</h2>
            <p className="text-xs text-neutral-500 mt-1">
              Your profile is signed in as <strong>{getRoleDisplayName(user.role)}</strong>, which does not have access to this workspace.
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => router.push(userDefault)}
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Go to Your Workspace ({userDefault})
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push("/login")}
              leftIcon={<LogIn className="h-4 w-4" />}
            >
              Switch Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
