import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test.describe("Platform Health & Core Routes Smoke Test", () => {
  test("should load root homepage and show dining selection or redirection", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Restro E-Billing/i);
  });

  test("should load dining menu page with QR token", async ({ page }) => {
    await page.goto("/menu/table-token-1");
    await expect(page.getByText(/Table Ordering/i).first()).toBeVisible();
    await expect(page.getByText(/Table 1/i).first()).toBeVisible();
  });

  test("should load kitchen display system", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/kitchen");
    await expect(page.getByRole("heading", { name: /SCULPX Kitchen/i })).toBeVisible();
  });

  test("should load admin overview", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin");
    await expect(page.getByText(/Hotel Back-Office Overview/i)).toBeVisible();
  });
});

