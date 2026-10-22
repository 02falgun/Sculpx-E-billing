import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrderSummaryCard } from "@/features/checkout/OrderSummaryCard";
import { CartItem, CartSummary, QRContext } from "@/types";

describe("OrderSummaryCard Component (Phase 3)", () => {
  const context: QRContext = {
    token: "table-token-5",
    type: "TABLE",
    identifier: "5",
    displayName: "Table 5",
    hotelId: "htl-1",
    hotelName: "Grand Palace",
    isActive: true,
  };

  const dummyItems: CartItem[] = [
    {
      id: "item-1",
      menuItemId: "item-butter-chicken",
      item: {
        id: "item-butter-chicken",
        categoryId: "cat-mains",
        name: "Old Delhi Butter Chicken",
        description: "",
        price: 520,
        preparationTimeMinutes: 20,
        dietaryType: "NON_VEG",
        isAvailable: true,
        taxRatePercentage: 5,
        createdAt: "",
        updatedAt: "",
      },
      quantity: 2,
      selectedModifiers: [
        {
          modifierGroupId: "modg-bread",
          modifierGroupName: "Bread",
          modifierId: "mod-naan",
          name: "Butter Garlic Naan",
          price: 75,
        },
      ],
      unitPrice: 595,
      totalPrice: 1190,
    },
  ];

  const summary: CartSummary = {
    subtotal: 1190,
    estimatedTax: 59.5,
    estimatedTotal: 1249.5,
    totalItems: 2,
  };

  it("should render line items with quantity, modifier, and amounts", () => {
    render(<OrderSummaryCard items={dummyItems} summary={summary} context={context} />);

    expect(screen.getByText(/2x Old Delhi Butter Chicken/i)).toBeInTheDocument();
    expect(screen.getByText(/Butter Garlic Naan/i)).toBeInTheDocument();
    expect(screen.getAllByText(/1,190/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/1,249.5/)).toBeInTheDocument();
  });
});
