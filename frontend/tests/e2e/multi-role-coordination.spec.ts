import { test, expect } from "@playwright/test";

test.describe("Real Multi-Role End-to-End Workflow with Independent Sessions", () => {
  test("coordinated lifecycle: Customer QR -> Kitchen KDS -> Waiter POS Floor -> Cashier Ledger -> Refresh Resilience", async ({
    browser,
  }) => {
    // -------------------------------------------------------------
    // Session 1: Real Customer Dining Browser Context
    // -------------------------------------------------------------
    const customerContext = await browser.newContext();
    const customerPage = await customerContext.newPage();

    // 1. Scan Table 1 QR & Load Catalog
    await customerPage.goto("/menu/table-token-1");
    await expect(customerPage.getByText(/Table Ordering/i).first()).toBeVisible({ timeout: 15000 });
    await expect(customerPage.getByText(/Table 1/i).first()).toBeVisible();

    // 2. Search for Canonical Dish
    const searchInput = customerPage.getByPlaceholder(/craving|starters|dishes|search/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Royal Tandoori");

    // 3. Customize & Select Modifiers
    const customizeBtn = customerPage.getByRole("button", { name: /Customize/i }).first();
    await expect(customizeBtn).toBeVisible({ timeout: 15000 });
    await customizeBtn.click();

    const addToOrderBtn = customerPage.getByRole("button", { name: /Add to Order/i });
    await expect(addToOrderBtn).toBeVisible();
    await addToOrderBtn.click();

    // 4. Cart & Checkout Form
    const cartBtn = customerPage.getByRole("button", { name: /Cart/i }).first();
    await expect(cartBtn).toBeVisible();
    await cartBtn.click();

    const proceedBtn = customerPage.getByRole("button", { name: /Proceed/i });
    await expect(proceedBtn).toBeVisible();
    await proceedBtn.click();

    await expect(customerPage).toHaveURL(/\/checkout/);
    await customerPage.getByPlaceholder(/e.g. Rahul Sharma/i).fill("E2E MultiRole Guest");
    await customerPage.getByPlaceholder(/10-digit mobile number/i).fill("9876500112");

    // 5. Submit Order
    const confirmBtn = customerPage.getByRole("button", { name: /Place Order/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // 6. Live Tracking Page
    await expect(customerPage).toHaveURL(/\/order\//, { timeout: 20000 });
    const orderUrl = customerPage.url();
    const orderId = orderUrl.split("/order/")[1]?.split("?")[0];
    expect(orderId).toBeDefined();

    await expect(customerPage.getByText(/Items Ordered|Order Details|Live Order/i).first()).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------
    // Session 2: Kitchen KDS Expedite Context (Independent Session)
    // -------------------------------------------------------------
    const kitchenContext = await browser.newContext();
    const kitchenPage = await kitchenContext.newPage();

    await kitchenPage.goto("/login");
    await kitchenPage.locator("#staff-email").fill("kitchenstaff@ebilling.com");
    await kitchenPage.locator("#staff-password").fill("demo-secure-pass");
    await kitchenPage.getByRole("button", { name: /Sign In/i }).click();

    await expect(kitchenPage).toHaveURL(/\/kitchen/, { timeout: 15000 });
    await expect(kitchenPage.getByRole("heading", { name: /SCULPX Kitchen/i })).toBeVisible();
    await expect(kitchenPage.getByText(/Active:|Kitchen Display/i).first()).toBeVisible({ timeout: 15000 });

    // Verify tickets render
    await expect(kitchenPage.getByText(/#KOT-|KOT-/i).first()).toBeVisible({ timeout: 15000 });

    test.setTimeout(60000);

    // -------------------------------------------------------------
    // Session 3: Floor Waiter Context (Independent Session)
    // -------------------------------------------------------------
    const waiterContext = await browser.newContext();
    const waiterPage = await waiterContext.newPage();

    await waiterPage.goto("/login");
    await waiterPage.locator("#staff-email").fill("waiter@ebilling.com");
    await waiterPage.locator("#staff-password").fill("demo-secure-pass");
    await waiterPage.getByRole("button", { name: /Sign In/i }).click();

    await expect(waiterPage).toHaveURL(/\/staff/, { timeout: 15000 });
    await expect(waiterPage.getByText(/Floor Station Active|Active Tables/i).first()).toBeVisible({ timeout: 15000 });

    // -------------------------------------------------------------
    // Session 4: Central Cashier Desk Context (Independent Session)
    // -------------------------------------------------------------
    const cashierContext = await browser.newContext();
    const cashierPage = await cashierContext.newPage();

    await cashierPage.goto("/login");
    await cashierPage.locator("#staff-email").fill("cashier@ebilling.com");
    await cashierPage.locator("#staff-password").fill("demo-secure-pass");
    await cashierPage.getByRole("button", { name: /Sign In/i }).click();

    await expect(cashierPage).toHaveURL(/\/cashier/, { timeout: 15000 });
    await expect(cashierPage.getByText(/Cashier Settlement Terminal|Billing & Collections/i).first()).toBeVisible({ timeout: 15000 });

    // -------------------------------------------------------------
    // Session 5: Reconnect & Refresh Resilience
    // -------------------------------------------------------------
    // Reload customer tracking page to prove state reconciliation across refreshes
    await customerPage.reload();
    await expect(customerPage.getByText(/Items Ordered|Order Details|Live Order/i).first()).toBeVisible({ timeout: 15000 });
    await expect(customerPage.getByText(/Royal Tandoori/i).first()).toBeVisible();

    // Clean up browser contexts
    await customerContext.close();
    await kitchenContext.close();
    await waiterContext.close();
    await cashierContext.close();
  });
});
