import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./helpers";

test.describe("Staff Operations & Kitchen Display System", () => {
  test("Floor Tables, POS, KDS ticket queue, Active Orders, and Settlement Ledger", async ({
    page,
  }) => {
    // 0. Authenticate as Admin
    await loginAsAdmin(page);

    // 1. Floor Tables Overview
    await page.goto("/tables");
    await expect(page.getByText(/Floor Tables & Layout/i)).toBeVisible();
    await expect(page.getByText(/Total Tables/i).first()).toBeVisible({ timeout: 15000 });

    // 2. Waiter POS terminal
    await page.goto("/pos");
    await expect(page.getByText(/Point of Sale|POS/i).first()).toBeVisible();
    await expect(page.getByText(/Current POS Ticket|Ticket/i).first()).toBeVisible({ timeout: 15000 });

    // 3. Kitchen Display System (KDS)
    await page.goto("/kitchen");
    await expect(page.getByRole("heading", { name: /SCULPX Kitchen/i })).toBeVisible();
    await expect(page.getByText(/Active:|NEW KOTS|Kitchen Display/i).first()).toBeVisible({ timeout: 15000 });

    // Verify KOT ticket cards render with table/room info
    const kotCard = page.getByText(/#KOT-|KOT-/i).first();
    await expect(kotCard).toBeVisible({ timeout: 15000 });

    // 4. Active Orders Management
    await page.goto("/orders");
    await expect(page.getByText(/Active Restaurant Orders/i)).toBeVisible();
    await expect(page.getByText(/All Orders/i).first()).toBeVisible({ timeout: 15000 });

    // 5. Billing Desk & Ledger
    await page.goto("/billing");
    await expect(page.getByText(/Central Billing & Cashier Desk/i)).toBeVisible();
    await expect(page.getByText(/Unsettled Tabs/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Paid & Settled/i)).toBeVisible({ timeout: 15000 });
  });
});
