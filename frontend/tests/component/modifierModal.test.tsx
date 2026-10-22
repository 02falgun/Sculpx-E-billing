import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ModifierModal } from "@/features/menu/ModifierModal";
import { useCartStore } from "@/store";
import { MenuItem } from "@/types";

describe("ModifierModal Component (Phase 2 Customer Menu)", () => {
  const item: MenuItem = {
    id: "item-biryani",
    categoryId: "cat-mains",
    name: "Dum Biryani",
    description: "Saffron infused basmati with tender meat",
    price: 500,
    preparationTimeMinutes: 20,
    dietaryType: "NON_VEG",
    isAvailable: true,
    taxRatePercentage: 5,
    modifierGroups: [
      {
        id: "modg-portion",
        name: "Portion Size",
        minSelections: 1,
        maxSelections: 1,
        isRequired: true,
        modifiers: [
          { id: "mod-reg", name: "Regular", price: 0, isAvailable: true, isDefault: true, createdAt: "", updatedAt: "" },
          { id: "mod-large", name: "Large", price: 200, isAvailable: true, createdAt: "", updatedAt: "" },
        ],
        createdAt: "",
        updatedAt: "",
      },
    ],
    createdAt: "",
    updatedAt: "",
  };

  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  it("should render modal with item title and modifier groups", () => {
    render(<ModifierModal item={item} isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText("Dum Biryani")).toBeInTheDocument();
    expect(screen.getByText("Portion Size")).toBeInTheDocument();
    expect(screen.getByText("Regular")).toBeInTheDocument();
    expect(screen.getByText("Large")).toBeInTheDocument();
  });

  it("should dynamically calculate price when options are changed and add to cart", () => {
    const handleClose = vi.fn();
    render(<ModifierModal item={item} isOpen={true} onClose={handleClose} />);

    // Initially regular portion is selected by default -> ₹500
    expect(screen.getAllByText(/500/).length).toBeGreaterThan(0);

    // Select Large portion (+200)
    const largeOption = screen.getByText("Large");
    fireEvent.click(largeOption);

    // Total button price should now reflect 700
    expect(screen.getByRole("button", { name: /700/i })).toBeInTheDocument();

    // Click Add to Order
    const addBtn = screen.getByRole("button", { name: /add to order/i });
    fireEvent.click(addBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
    const cartItems = useCartStore.getState().items;
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].unitPrice).toBe(700);
  });
});
