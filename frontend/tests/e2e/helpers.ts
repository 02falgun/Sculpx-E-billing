import { Page, expect } from "@playwright/test";

export async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.locator("#staff-email").fill("admin@ebilling.com");
  await page.locator("#staff-password").fill("demo-secure-pass");
  const signInBtn = page.getByRole("button", { name: /Sign In/i });
  await expect(signInBtn).toBeVisible({ timeout: 5000 });
  await signInBtn.click();
  await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });
}
