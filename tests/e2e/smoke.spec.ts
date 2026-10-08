import { test, expect } from "@playwright/test";

test.describe("Platform Health & Core Routes Smoke Test", () => {
  test("should load root homepage and show dining selection or redirection", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Restro E-Billing/i);
  });

  test("should load dining menu page with QR token", async ({ page }) => {
    await page.goto("/menu/table-token-1");
    await expect(page.getByText(/The Grand Royal Palace & Resort/i).first()).toBeVisible();
    await expect(page.getByText(/Table 1/i).first()).toBeVisible();
  });

  test("should load kitchen display system", async ({ page }) => {
    await page.goto("/kitchen");
    await expect(page.getByText(/Kitchen Display System/i)).toBeVisible();
  });

  test("should load admin overview", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText(/Hotel Back-Office Overview/i)).toBeVisible();
  });
});
