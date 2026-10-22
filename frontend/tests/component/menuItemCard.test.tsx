import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MenuItemCard } from "@/features/menu/MenuItemCard";
import { MenuItem } from "@/types";

describe("MenuItemCard Component (Phase 2 Customer Menu)", () => {
  const dummyItemWithModifiers: MenuItem = {
    id: "item-pizza-1",
    categoryId: "cat-pizzas",
    name: "Wild Mushroom Pizza",
    description: "Wood-fired with fresh burrata and basil",
    price: 560,
    preparationTimeMinutes: 18,
    dietaryType: "VEG",
    isAvailable: true,
    isBestseller: true,
    taxRatePercentage: 5,
    modifierGroups: [
      {
        id: "modg-crust",
        name: "Crust Selection",
        minSelections: 1,
        maxSelections: 1,
        isRequired: true,
        modifiers: [
          { id: "mod-thin", name: "Thin Crust", price: 0, isAvailable: true, createdAt: "", updatedAt: "" },
        ],
        createdAt: "",
        updatedAt: "",
      },
    ],
    createdAt: "",
    updatedAt: "",
  };

  it("should render item name, price, prep time, and bestseller tag", () => {
    const handleOpen = vi.fn();
    render(<MenuItemCard item={dummyItemWithModifiers} onOpenModifiers={handleOpen} />);

    expect(screen.getByText("Wild Mushroom Pizza")).toBeInTheDocument();
    expect(screen.getByText(/560/)).toBeInTheDocument();
    expect(screen.getByText(/18 mins/i)).toBeInTheDocument();
    expect(screen.getByText(/bestseller/i)).toBeInTheDocument();
  });

  it("should display 'Customize' button for item with modifiers and trigger modal callback", () => {
    const handleOpen = vi.fn();
    render(<MenuItemCard item={dummyItemWithModifiers} onOpenModifiers={handleOpen} />);

    const customizeBtn = screen.getByRole("button", { name: /customize/i });
    expect(customizeBtn).toBeInTheDocument();

    fireEvent.click(customizeBtn);
    expect(handleOpen).toHaveBeenCalledTimes(1);
    expect(handleOpen).toHaveBeenCalledWith(dummyItemWithModifiers);
  });
});
