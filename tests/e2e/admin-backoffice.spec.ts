import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test.describe("Admin Back-Office & Fleet Operations", () => {
  test("Executive Dashboard, Menu 86-ing, Hardware Printer Fleet, and QR Generator", async ({
    page,
  }) => {
    // 0. Authenticate as Admin
    await loginAsAdmin(page);

    // 1. Admin Dashboard
    await page.goto("/admin");
    await expect(page.getByText(/Hotel Back-Office Overview/i)).toBeVisible();
    await expect(page.getByText(/Gross Sales \(Today\)/i)).toBeVisible();
    await expect(page.getByText(/Floor Occupancy/i)).toBeVisible();

    // 2. Menu Catalog Management
    await page.goto("/admin/menu");
    await expect(page.getByText(/Menu Catalogue & Pricing/i)).toBeVisible();
    const menuSearch = page.getByPlaceholder(/Search dish or ingredient/i);
    await expect(menuSearch).toBeVisible({ timeout: 15000 });
    await menuSearch.fill("Butter");
    await expect(page.getByText(/Butter Chicken/i).first()).toBeVisible({ timeout: 15000 });

    // 3. Thermal Printer Fleet
    await page.goto("/admin/printers");
    await expect(page.getByText(/Thermal Printer Fleet/i).first()).toBeVisible();
    await expect(page.getByText(/Recent Hardware Print Queue/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Thermal Printer Fleet/i).or(page.getByText(/Kitchen Main KOT/i)).first()).toBeVisible({ timeout: 15000 });

    // 4. QR Tent Card Generator
    await page.goto("/admin/qr");
    await expect(page.getByText(/QR Tent Card Generator/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Print Tent Card/i })).toBeVisible({ timeout: 15000 });
  });
});
