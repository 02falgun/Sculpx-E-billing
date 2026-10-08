import { test, expect } from "@playwright/test";

test.describe("Staff Operations & Kitchen Display System", () => {
  test("Floor Tables, POS, KDS ticket queue, Active Orders, and Settlement Ledger", async ({
    page,
  }) => {
    // 1. Floor Tables Overview
    await page.goto("/tables");
    await expect(page.getByText(/Floor Tables & Layout/i)).toBeVisible();
    await expect(page.getByText(/Indoor Garden/i).first()).toBeVisible();

    // 2. Waiter POS terminal
    await page.goto("/pos");
    await expect(page.getByText(/Point of Sale \(POS\) Terminal/i)).toBeVisible();
    await expect(page.getByText(/Current POS Ticket/i)).toBeVisible();

    // 3. Kitchen Display System (KDS)
    await page.goto("/kitchen");
    await expect(page.getByText(/Kitchen Display System/i)).toBeVisible();
    await expect(page.getByText(/Active Tickets/i)).toBeVisible();

    // Verify KOT ticket cards render with table/room info
    const kotCard = page.getByText(/KOT-1042/i).or(page.getByText(/Table 5/i)).first();
    await expect(kotCard).toBeVisible();

    // 4. Active Orders Management
    await page.goto("/orders");
    await expect(page.getByText(/Active Restaurant Orders/i)).toBeVisible();
    await expect(page.getByText(/All Orders/i).first()).toBeVisible();

    // 5. Billing Desk & Ledger
    await page.goto("/billing");
    await expect(page.getByText(/Central Billing & Cashier Desk/i)).toBeVisible();
    await expect(page.getByText(/Unsettled Tabs/i)).toBeVisible();
    await expect(page.getByText(/Paid & Settled/i)).toBeVisible();
  });
});
