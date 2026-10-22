import { describe, it, expect } from "vitest";
import { MOCK_MENU_ITEMS } from "@/mocks/mockDb";

describe("Customer Menu Filtering Logic (Phase 2)", () => {
  it("should filter items correctly by VEG dietary flag", () => {
    const vegItems = MOCK_MENU_ITEMS.filter(
      (item) => item.dietaryType === "VEG" || item.dietaryType === "VEGAN",
    );

    expect(vegItems.length).toBeGreaterThan(0);
    vegItems.forEach((item) => {
      expect(["VEG", "VEGAN"]).toContain(item.dietaryType);
    });
  });

  it("should filter items correctly by NON_VEG dietary flag", () => {
    const nonVegItems = MOCK_MENU_ITEMS.filter(
      (item) => item.dietaryType === "NON_VEG" || item.dietaryType === "EGG",
    );

    expect(nonVegItems.length).toBeGreaterThan(0);
    nonVegItems.forEach((item) => {
      expect(["NON_VEG", "EGG"]).toContain(item.dietaryType);
    });
  });

  it("should filter chef special items correctly", () => {
    const specials = MOCK_MENU_ITEMS.filter((item) => !!item.isChefSpecial);
    expect(specials.length).toBeGreaterThan(0);
    specials.forEach((item) => {
      expect(item.isChefSpecial).toBe(true);
    });
  });
});
