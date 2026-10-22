import { create } from "zustand";

export interface ToastNotification {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title?: string;
  message: string;
  durationMs?: number;
}

interface UIStoreState {
  isCartDrawerOpen: boolean;
  toasts: ToastNotification[];

  setCartDrawerOpen: (open: boolean) => void;
  addToast: (toast: Omit<ToastNotification, "id">) => void;
  removeToast: (id: string) => void;
}

export const useUIStore = create<UIStoreState>((set) => ({
  isCartDrawerOpen: false,
  toasts: [],

  setCartDrawerOpen: (open) => set({ isCartDrawerOpen: open }),

  addToast: (toast) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    const newToast: ToastNotification = { ...toast, id };
    set((state) => ({ toasts: [...state.toasts, newToast] }));

    const duration = toast.durationMs || 4000;
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, duration);
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
