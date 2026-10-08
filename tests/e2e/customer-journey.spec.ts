import { test, expect } from "@playwright/test";

test.describe("Full Customer QR Ordering & E-Billing Flow", () => {
  test("complete customer lifecycle: QR -> Menu -> Customization -> Cart -> Checkout -> Live Order -> Digital Bill", async ({
    page,
  }) => {
    // 1. Scan / Access Dining Menu via Table QR
    await page.goto("/menu/table-token-1");
    await expect(page.getByText(/The Grand Royal Palace & Resort/i).first()).toBeVisible();
    await expect(page.getByText(/Table 1/i).first()).toBeVisible();

    // 2. Search for dishes in catalog
    const searchInput = page.getByPlaceholder(/Search for starters/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Paneer");

    // 3. Click Customize button to open modifier / customization modal
    const customizeBtn = page.getByRole("button", { name: /Customize/i }).first();
    await expect(customizeBtn).toBeVisible();
    await customizeBtn.click();

    // 4. In modifier modal, select spice level or option and add to order
    const modalHeading = page.getByRole("dialog").getByRole("heading", { name: /Royal Tandoori Paneer Tikka/i });
    await expect(modalHeading).toBeVisible();

    const addToOrderBtn = page.getByRole("button", { name: /Add to Order/i });
    await expect(addToOrderBtn).toBeVisible();
    await addToOrderBtn.click();

    // 5. Open Cart drawer and proceed to checkout
    const cartBtn = page.getByRole("button", { name: /Cart/i }).first();
    await expect(cartBtn).toBeVisible();
    await cartBtn.click();

    const proceedBtn = page.getByRole("button", { name: /Proceed/i });
    await expect(proceedBtn).toBeVisible();
    await proceedBtn.click();

    // 6. Verify Checkout & Order Page
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByRole("heading", { name: /Checkout & Order/i })).toBeVisible();

    // 7. Complete Checkout Form
    const nameInput = page.getByPlaceholder(/e.g. Rahul Sharma/i);
    await nameInput.fill("Arun Varma");

    const phoneInput = page.getByPlaceholder(/10-digit mobile number/i);
    await phoneInput.fill("9876543210");

    // 8. Place order
    const confirmBtn = page.getByRole("button", { name: /Confirm & Place Order/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // 9. Redirected to Live Order Tracking page
    await expect(page).toHaveURL(/\/order\/ord-/);
    await expect(page.getByText(/Items Ordered/i)).toBeVisible();

    // 10. Access digital invoice for active bill
    await page.goto("/bill/bill-1001");
    await expect(page.getByText(/Official GST Tax Invoice/i)).toBeVisible();
    await expect(page.getByText(/Add Gratuity/i)).toBeVisible();
  });
});
