import { describe, it, expect, beforeEach } from "vitest";
import { useCartStore } from "@/store/cartStore";
import { MenuItem, QRContext } from "@/types";

describe("Cart Store Logic (Phase 1 Foundation)", () => {
  const dummyContext: QRContext = {
    token: "table-token-5",
    type: "TABLE",
    identifier: "5",
    displayName: "Table 5",
    hotelId: "htl-1",
    hotelName: "Grand Palace",
    isActive: true,
  };

  const dummyItem: MenuItem = {
    id: "item-pizza",
    categoryId: "cat-pizzas",
    name: "Margherita Pizza",
    description: "Classic cheese and tomato",
    price: 400,
    preparationTimeMinutes: 15,
    dietaryType: "VEG",
    isAvailable: true,
    taxRatePercentage: 5,
    createdAt: "",
    updatedAt: "",
  };

  beforeEach(() => {
    useCartStore.getState().clearCart();
    useCartStore.getState().setQRContext(dummyContext);
  });

  it("should initialize with empty items and set QR context", () => {
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(0);
    expect(state.qrContext?.identifier).toBe("5");
    expect(state.qrContext?.type).toBe("TABLE");
  });

  it("should add item with base price and calculate summary correctly", () => {
    useCartStore.getState().addItem(dummyItem, [], 1);
    const summary = useCartStore.getState().getSummary();

    expect(summary.totalItems).toBe(1);
    expect(summary.subtotal).toBe(400);
    expect(summary.estimatedTax).toBe(20); // 5% of 400
    expect(summary.estimatedTotal).toBe(420);
  });

  it("should correctly incorporate selected modifier prices", () => {
    const modifiers = [
      {
        modifierGroupId: "modg-crust",
        modifierGroupName: "Crust",
        modifierId: "mod-cheese",
        name: "Cheese Burst",
        price: 80,
      },
    ];

    useCartStore.getState().addItem(dummyItem, modifiers, 2);
    const summary = useCartStore.getState().getSummary();

    // Unit price = 400 + 80 = 480. Quantity = 2. Subtotal = 960.
    expect(summary.totalItems).toBe(2);
    expect(summary.subtotal).toBe(960);
    expect(summary.estimatedTax).toBe(48); // 5% of 960
    expect(summary.estimatedTotal).toBe(1008);
  });

  it("should increment quantity for identical item and modifiers", () => {
    useCartStore.getState().addItem(dummyItem, [], 1);
    useCartStore.getState().addItem(dummyItem, [], 2);

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(3);
    expect(items[0].totalPrice).toBe(1200);
  });

  it("should update quantity and remove item when quantity hits zero", () => {
    useCartStore.getState().addItem(dummyItem, [], 2);
    const itemId = useCartStore.getState().items[0].id;

    useCartStore.getState().updateQuantity(itemId, 1);
    expect(useCartStore.getState().items[0].quantity).toBe(1);

    useCartStore.getState().updateQuantity(itemId, 0);
    expect(useCartStore.getState().items).toHaveLength(0);
  });
});
