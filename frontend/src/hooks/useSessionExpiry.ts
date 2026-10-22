"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { QueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import { useAuthStore } from "@/store/authStore";
import { useUIStore } from "@/store/uiStore";

/**
 * When any staff API call returns 401, end the session in one place:
 * clear the stored login, drop cached data, and send the user to /login
 * with a redirect back to the page they were on.
 */
export function useSessionExpiry(queryClient: QueryClient): void {
  const router = useRouter();

  useEffect(() => {
    return apiClient.onUnauthorized(() => {
      useAuthStore.getState().clearSession();
      queryClient.clear();

      const { pathname, search } = window.location;
      if (pathname.startsWith("/login")) return;

      useUIStore.getState().addToast({
        type: "error",
        title: "Session expired",
        message: "Please sign in again to continue.",
      });
      router.replace(`/login?redirect=${encodeURIComponent(pathname + search)}`);
    });
  }, [router, queryClient]);
}
