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

    if (!isAuthenticated || !user) {
      // Redirect to login
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
  }, [pathname, isAuthenticated, user, allowedRoles, router]);

  if (checking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Spinner size="lg" className="text-amber-500" />
        <p className="text-xs font-semibold text-slate-400">Verifying station authorization...</p>
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
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Restricted Station</h2>
            <p className="text-xs text-slate-500 mt-1">
              Your profile is logged in as <strong>{getRoleDisplayName(user.role)}</strong>, which does not have access to this workspace.
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
              variant="outline"
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
