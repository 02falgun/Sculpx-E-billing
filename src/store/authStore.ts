import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { AuthSession, User } from "@/types";

interface AuthStoreState {
  session: AuthSession | null;
  user: User | null;
  isAuthenticated: boolean;

  setSession: (session: AuthSession) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      session: null,
      user: null,
      isAuthenticated: false,

      setSession: (session) =>
        set({
          session,
          user: session.user,
          isAuthenticated: true,
        }),

      clearSession: () =>
        set({
          session: null,
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "restro_staff_auth",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" && typeof window.localStorage?.setItem === "function"
          ? window.localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
      ),
    },
  ),
);
