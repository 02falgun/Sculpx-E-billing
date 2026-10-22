import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { AuthSession, User } from "@/types";
import { DEMO_USERS, mockAuthenticate } from "@/utils/auth";

interface AuthStoreState {
  session: AuthSession | null;
  user: User | null;
  isAuthenticated: boolean;

  setSession: (session: AuthSession) => void;
  updateUser: (user: User) => void;
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

      updateUser: (user) =>
        set((state) => ({
          user,
          session: state.session ? { ...state.session, user } : null,
        })),

      clearSession: () => {
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

      logout: () => {
        if (typeof window !== "undefined") {
          try {
            window.localStorage.removeItem("restro_staff_auth");
            // Also notify backend if supported (fire and forget)
            import("@/services/api").then(({ authApi }) => {
              authApi.logout().catch(() => {});
            }).catch(() => {});
          } catch {}
        }
        set({
          session: null,
          user: null,
          isAuthenticated: false,
        });
      },

      switchRole: (roleKey: string) => {
        if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_USE_MOCK_API !== "true") {
          // Never allow unauthenticated role switching when connected to real backend
          return null;
        }
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
