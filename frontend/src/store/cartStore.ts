import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem, CartSummary, MenuItem, QRContext, SelectedModifier } from "@/types";

interface CartStoreState {
  items: CartItem[];
  qrContext: QRContext | null;
  customerName: string;
  customerPhone: string;
  specialInstructions: string;

  // Actions
  setQRContext: (context: QRContext) => void;
  addItem: (
    item: MenuItem,
    selectedModifiers: SelectedModifier[],
    quantity: number,
    specialInstructions?: string,
  ) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  setCustomerDetails: (name?: string, phone?: string, notes?: string) => void;
  getSummary: () => CartSummary;
}

function generateCartItemId(
  menuItemId: string,
  modifiers: SelectedModifier[],
  instructions?: string,
): string {
  const modIds = modifiers.map((m) => m.modifierId).sort().join(":");
  return `${menuItemId}_${modIds}_${instructions || ""}`;
}

export const useCartStore = create<CartStoreState>()(
  persist(
    (set, get) => ({
      items: [],
      qrContext: null,
      customerName: "",
      customerPhone: "",
      specialInstructions: "",

      setQRContext: (context) => {
        const current = get().qrContext;
        // If switching table/room context, reset items to prevent cross-table order leakage
        if (current && current.token !== context.token) {
          set({ qrContext: context, items: [] });
        } else {
          set({ qrContext: context });
        }
      },

      addItem: (item, selectedModifiers, quantity, specialInstructions) => {
        const cartItemId = generateCartItemId(item.id, selectedModifiers, specialInstructions);
        const existingItems = get().items;
        const existingIndex = existingItems.findIndex((i) => i.id === cartItemId);

        let modifierTotal = 0;
        selectedModifiers.forEach((m) => {
          modifierTotal += m.price;
        });

        const unitPrice = item.price + modifierTotal;

        if (existingIndex > -1) {
          const updated = [...existingItems];
          const newQty = updated[existingIndex].quantity + quantity;
          updated[existingIndex] = {
            ...updated[existingIndex],
            quantity: newQty,
            totalPrice: unitPrice * newQty,
          };
          set({ items: updated });
        } else {
          const newItem: CartItem = {
            id: cartItemId,
            menuItemId: item.id,
            item,
            quantity,
            selectedModifiers,
            specialInstructions,
            unitPrice,
            totalPrice: unitPrice * quantity,
          };
          set({ items: [...existingItems, newItem] });
        }
      },

      removeItem: (cartItemId) => {
        set({ items: get().items.filter((i) => i.id !== cartItemId) });
      },

      updateQuantity: (cartItemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.id === cartItemId
              ? {
                  ...i,
                  quantity,
                  totalPrice: i.unitPrice * quantity,
                }
              : i,
          ),
        });
      },

      clearCart: () => {
        set({ items: [], specialInstructions: "" });
      },

      setCustomerDetails: (name, phone, notes) => {
        set((state) => ({
          customerName: name !== undefined ? name : state.customerName,
          customerPhone: phone !== undefined ? phone : state.customerPhone,
          specialInstructions: notes !== undefined ? notes : state.specialInstructions,
        }));
      },

      getSummary: () => {
        const items = get().items;
        let subtotal = 0;
        let totalItems = 0;

        items.forEach((item) => {
          subtotal += item.totalPrice;
          totalItems += item.quantity;
        });

        // 5% estimated standard restaurant GST
        const estimatedTax = Math.round(subtotal * 0.05 * 100) / 100;
        const estimatedTotal = subtotal + estimatedTax;

        return {
          subtotal,
          estimatedTax,
          estimatedTotal,
          totalItems,
        };
      },
    }),
    {
      name: "restro_cart_session",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" && typeof window.localStorage?.setItem === "function"
          ? window.localStorage
          : {
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            },
      ),
      partialize: (state) => ({
        items: state.items,
        qrContext: state.qrContext,
        customerName: state.customerName,
        customerPhone: state.customerPhone,
        specialInstructions: state.specialInstructions,
      }),
    },
  ),
);
