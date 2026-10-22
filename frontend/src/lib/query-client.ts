import { QueryClient } from "@tanstack/react-query";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute default stale time
        gcTime: 10 * 60 * 1000, // 10 minutes cache garbage collection
        retry: (failureCount, error) => {
          // Do not retry 4xx errors
          if (
            typeof error === "object" &&
            error !== null &&
            "status" in error &&
            typeof (error as { status: unknown }).status === "number" &&
            (error as { status: number }).status >= 400 &&
            (error as { status: number }).status < 500
          ) {
            return false;
          }
          return failureCount < 2;
        },
        refetchOnWindowFocus: process.env.NODE_ENV === "production",
      },
      mutations: {
        retry: false,
      },
    },
  });
}
