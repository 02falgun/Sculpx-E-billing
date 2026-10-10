import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "@/services/api/client";
import {
  HttpAuthService,
  HttpMenuService,
  HttpOrderService,
  HttpKitchenService,
  HttpBillingService,
  HttpPaymentService,
  HttpInventoryService,
  HttpPrinterService,
  HttpRoomService,
  HttpTableService,
  HttpUserService,
} from "@/services/api/http";

describe("HTTP Service Layer Tests", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("HttpAuthService forwards login, logout, and getCurrentUser to apiClient", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue({
      success: true,
      data: { user: {} as any, token: "jwt-test", expiresAt: "2026-12-31" },
    });
    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue({
      success: true,
      data: { id: "usr-1" } as any,
    });

    const service = new HttpAuthService();
    await service.login({ email: "admin@test.com", pinOrPassword: "secret" });
    expect(postSpy).toHaveBeenCalledWith("/auth/login", { email: "admin@test.com", pinOrPassword: "secret" });

    await service.logout();
    expect(postSpy).toHaveBeenCalledWith("/auth/logout");

    await service.getCurrentUser();
    expect(getSpy).toHaveBeenCalledWith("/auth/me");
  });

  it("HttpMenuService calls /menu/context/:token, /menu/categories, and /menu/items", async () => {
    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue({ success: true, data: [] as any });
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue({ success: true, data: {} as any });
    const patchSpy = vi.spyOn(apiClient, "patch").mockResolvedValue({ success: true, data: {} as any });
    const deleteSpy = vi.spyOn(apiClient, "delete").mockResolvedValue({ success: true, data: undefined as any });

    const service = new HttpMenuService();
    await service.getContextByQrToken("tbl-01");
    expect(getSpy).toHaveBeenCalledWith("/menu/context/tbl-01");

    await service.getCategories();
    expect(getSpy).toHaveBeenCalledWith("/menu/categories");

    await service.getMenuItems({ categoryId: "cat-1", search: "pizza" });
    expect(getSpy).toHaveBeenCalledWith("/menu/items", { params: { categoryId: "cat-1", search: "pizza" } });

    await service.getMenuItemById("item-1");
    expect(getSpy).toHaveBeenCalledWith("/menu/items/item-1");

    await service.createMenuItem({ name: "Paneer Tikka", price: 300 });
    expect(postSpy).toHaveBeenCalledWith("/menu/items", { name: "Paneer Tikka", price: 300 });

    await service.updateMenuItem("item-1", { isAvailable: false });
    expect(patchSpy).toHaveBeenCalledWith("/menu/items/item-1", { isAvailable: false });

    await service.deleteMenuItem("item-1");
    expect(deleteSpy).toHaveBeenCalledWith("/menu/items/item-1");
  });

  it("HttpOrderService handles order validation, creation, retrieval, and status updates", async () => {
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue({ success: true, data: {} as any });
    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue({ success: true, data: {} as any });
    const patchSpy = vi.spyOn(apiClient, "patch").mockResolvedValue({ success: true, data: {} as any });

    const service = new HttpOrderService();
    const payload = {
      qrToken: "tbl-01",
      customerName: "Alice",
      customerPhone: "+91 99999 88888",
      paymentPreference: "PAY_LATER" as const,
      items: [{ menuItemId: "item-1", quantity: 2, modifierIds: [] }],
    };

    await service.validateOrder(payload);
    expect(postSpy).toHaveBeenCalledWith("/orders/validate", payload);

    await service.createOrder(payload);
    expect(postSpy).toHaveBeenCalledWith("/orders", payload);

    await service.getOrderById("ord-123");
    expect(getSpy).toHaveBeenCalledWith("/orders/ord-123");

    await service.getOrders({ status: "CONFIRMED", qrType: "TABLE", pagination: { page: 1, limit: 10 } });
    expect(getSpy).toHaveBeenCalledWith("/orders", {
      params: { status: "CONFIRMED", qrType: "TABLE", page: 1, limit: 10 },
    });

    await service.updateOrderStatus("ord-123", "PREPARING", "Chef accepted ticket");
    expect(patchSpy).toHaveBeenCalledWith("/orders/ord-123/status", { status: "PREPARING", note: "Chef accepted ticket" });

    await service.cancelOrder("ord-123", "Customer cancelled table");
    expect(postSpy).toHaveBeenCalledWith("/orders/ord-123/cancel", { reason: "Customer cancelled table" });
  });

  it("HttpKitchenService calls /kitchen/kots endpoints", async () => {
    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue({ success: true, data: [] as any });
    const patchSpy = vi.spyOn(apiClient, "patch").mockResolvedValue({ success: true, data: {} as any });

    const service = new HttpKitchenService();
    await service.getActiveKOTs();
    expect(getSpy).toHaveBeenCalledWith("/kitchen/kots");

    await service.getKOTById("kot-1");
    expect(getSpy).toHaveBeenCalledWith("/kitchen/kots/kot-1");

    await service.updateKOTStatus("kot-1", { status: "READY", note: "Ready for runner" });
    expect(patchSpy).toHaveBeenCalledWith("/kitchen/kots/kot-1/status", { status: "READY", note: "Ready for runner" });
  });

  it("HttpBillingService and HttpPaymentService call billing and payment endpoints", async () => {
    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue({ success: true, data: {} as any });
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue({ success: true, data: {} as any });

    const billingService = new HttpBillingService();
    await billingService.getBillById("bill-101");
    expect(getSpy).toHaveBeenCalledWith("/bills/bill-101");

    await billingService.getBillByOrderId("ord-101");
    expect(getSpy).toHaveBeenCalledWith("/bills/order/ord-101");

    await billingService.generateBillForOrder("ord-101");
    expect(postSpy).toHaveBeenCalledWith("/bills/order/ord-101/generate");

    await billingService.applyDiscount("bill-101", { type: "PERCENTAGE", value: 10, code: "VIP10" });
    expect(postSpy).toHaveBeenCalledWith("/bills/bill-101/discount", { type: "PERCENTAGE", value: 10, code: "VIP10" });

    await billingService.voidBill("bill-101", "Order cancelled by manager");
    expect(postSpy).toHaveBeenCalledWith("/bills/bill-101/void", { reason: "Order cancelled by manager" });

    const paymentService = new HttpPaymentService();
    await paymentService.recordPayment({
      billId: "bill-101",
      amount: 550,
      method: "UPI",
      transactionReference: "UPI-TXN-12345",
    });
    expect(postSpy).toHaveBeenCalledWith("/bills/bill-101/payments", {
      billId: "bill-101",
      amount: 550,
      method: "UPI",
      transactionReference: "UPI-TXN-12345",
    });

    await paymentService.processRefund("pay-101", 550, "Customer returned meal");
    expect(postSpy).toHaveBeenCalledWith("/payments/pay-101/refund", {
      amount: 550,
      reason: "Customer returned meal",
    });
  });

  it("HttpInventoryService, HttpPrinterService, HttpRoomService, and HttpTableService dispatch correctly", async () => {
    const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue({ success: true, data: {} as any });
    const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue({ success: true, data: {} as any });
    const patchSpy = vi.spyOn(apiClient, "patch").mockResolvedValue({ success: true, data: {} as any });

    const inv = new HttpInventoryService();
    await inv.getItems({ isLowStock: true });
    expect(getSpy).toHaveBeenCalledWith("/inventory/items", { params: { isLowStock: true, search: undefined, page: undefined, limit: undefined } });

    await inv.recordStockAdjustment("inv-1", -2, "Used in curry", "USAGE");
    expect(postSpy).toHaveBeenCalledWith("/inventory/adjustments", {
      itemId: "inv-1",
      quantityChange: -2,
      reason: "Used in curry",
      type: "USAGE",
    });

    const printer = new HttpPrinterService();
    await printer.getPrinters();
    expect(getSpy).toHaveBeenCalledWith("/printers");

    await printer.retryPrintJob("job-1");
    expect(postSpy).toHaveBeenCalledWith("/print-jobs/job-1/retry");

    const room = new HttpRoomService();
    await room.updateRoomStatus("rm-101", "OCCUPIED");
    expect(patchSpy).toHaveBeenCalledWith("/rooms/rm-101/status", { status: "OCCUPIED" });

    const table = new HttpTableService();
    await table.updateTableStatus("tbl-01", "OCCUPIED");
    expect(patchSpy).toHaveBeenCalledWith("/tables/tbl-01/status", { status: "OCCUPIED" });

    const user = new HttpUserService();
    await user.updateUserRole("usr-1", "MANAGER");
    expect(patchSpy).toHaveBeenCalledWith("/users/usr-1/role", { role: "MANAGER" });
  });
});
