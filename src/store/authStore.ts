import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { AuthSession, User } from "@/types";
import { DEMO_USERS, mockAuthenticate } from "@/utils/auth";

interface AuthStoreState {
  session: AuthSession | null;
  user: User | null;
  isAuthenticated: boolean;

  setSession: (session: AuthSession) => void;
  clearSession: () => void;
  logout: () => void;
  switchRole: (roleKey: string) => AuthSession | null;
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

      logout: () => {
        if (typeof window !== "undefined") {
          try {
            window.localStorage.removeItem("restro_staff_auth");
          } catch {}
        }
        set({
          session: null,
          user: null,
          isAuthenticated: false,
        });
      },

      switchRole: (roleKey: string) => {
        const demoUser = DEMO_USERS[roleKey];
        if (!demoUser) return null;
        const session = mockAuthenticate(demoUser.user.email);
        if (session) {
          set({
            session,
            user: session.user,
            isAuthenticated: true,
          });
        }
        return session;
      },
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
