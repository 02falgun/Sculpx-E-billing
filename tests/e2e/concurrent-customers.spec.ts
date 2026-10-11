import { test, expect } from "@playwright/test";

test.describe("Concurrent Customer Ordering & State Reconciliation", () => {
  test("12 concurrent customer sessions place orders and verify persistence & reload", async ({
    browser,
  }) => {
    test.setTimeout(90000);
    const CONCURRENT_SESSIONS = 12;
    const sessionResults: Array<{ sessionId: number; orderId: string; status: string }> = [];

    // Run 12 concurrent customer sessions with realistic arrival staggering
    const sessionPromises = Array.from({ length: CONCURRENT_SESSIONS }).map(async (_, idx) => {
      const sessionId = idx + 1;
      // Stagger arrivals slightly (realistic patron arrival spread)
      await new Promise((resolve) => setTimeout(resolve, idx * 600));

      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        // 1. Scan Table 1 QR & Load Catalog
        await page.goto("/menu/table-token-1");
        await expect(page.getByText(/Table Ordering/i).first()).toBeVisible({ timeout: 20000 });

        // 2. Select first available Add/Customize button
        const addBtn = page.getByRole("button", { name: /Add|Customize/i }).first();
        await expect(addBtn).toBeVisible({ timeout: 15000 });
        await addBtn.click();

        // If modifier modal appeared, click Add to Order
        const modalAddBtn = page.getByRole("dialog").getByRole("button", { name: /Add to Order/i });
        if (await modalAddBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await modalAddBtn.click();
        }

        // 3. Open Cart & Proceed
        const cartBtn = page.getByRole("button", { name: /Cart/i }).first();
        await expect(cartBtn).toBeVisible({ timeout: 10000 });
        await cartBtn.click();

        const proceedBtn = page.getByRole("button", { name: /Proceed/i });
        await expect(proceedBtn).toBeVisible({ timeout: 10000 });
        await proceedBtn.click();

        // 4. Fill guest checkout details
        await expect(page).toHaveURL(/\/checkout/, { timeout: 15000 });
        await page.getByPlaceholder(/e.g. Rahul Sharma/i).fill(`Pilot Guest ${sessionId}`);
        await page.getByPlaceholder(/10-digit mobile number/i).fill(`98765000${String(sessionId).padStart(2, "0")}`);

        test.setTimeout(120000);

        // 5. Submit Order
        const placeOrderBtn = page.getByRole("button", { name: /Place Order/i });
        await expect(placeOrderBtn).toBeVisible();
        await placeOrderBtn.click();

        // If retry banner appears due to backpressure, click Retry Submission
        const retryBtn = page.getByRole("button", { name: /Retry Submission/i });
        if (await retryBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await retryBtn.click();
        }

        // 6. Confirm Live Order Tracking page & extract Order ID
        await expect(page).toHaveURL(/\/order\//, { timeout: 35000 });
        const currentUrl = page.url();
        const orderId = currentUrl.split("/order/")[1]?.split("?")[0] || "unknown";

        await expect(page.getByText(/Items Ordered|Order Details|Live Order/i).first()).toBeVisible({ timeout: 20000 });

        // 7. Verify Reconnect / Reload Resilience
        await page.reload();
        await expect(page.getByText(/Items Ordered|Order Details|Live Order/i).first()).toBeVisible({ timeout: 15000 });

        sessionResults.push({
          sessionId,
          orderId,
          status: "SUCCESS_PERSISTED",
        });
      } finally {
        await context.close();
      }
    });

    await Promise.all(sessionPromises);

    // Verify all 12 sessions succeeded with distinct valid order IDs
    expect(sessionResults.length).toBe(CONCURRENT_SESSIONS);
    const orderIds = new Set(sessionResults.map((r) => r.orderId));
    expect(orderIds.size).toBe(CONCURRENT_SESSIONS);

    console.log(`[TEST SUCCESS] All ${CONCURRENT_SESSIONS} concurrent customer sessions executed successfully:`);
    sessionResults.forEach((r) => {
      console.log(`  - Session #${r.sessionId}: Order ID = ${r.orderId} (${r.status})`);
    });
  });
});
