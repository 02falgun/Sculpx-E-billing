import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { CheckoutForm } from "@/features/checkout/CheckoutForm";
import { useCartStore } from "@/store";
import { getOrderService } from "@/services/api";
import { webSocketManager } from "@/services/websocket";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("SCULPX E-Billing — Phase 3B.4 Frontend Order Integration & Realtime Tests", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Reset cart store
    useCartStore.setState({
      items: [
        {
          id: "cart-item-1",
          menuItemId: "item-butter-chicken-1",
          item: {
            id: "item-butter-chicken-1",
            categoryId: "cat-1",
            name: "Makhani Butter Chicken",
            price: 450,
            taxRatePercentage: 5,
            isAvailable: true,
            dietaryType: "NON_VEG",
          } as any,
          quantity: 2,
          selectedModifiers: [
            {
              modifierId: "mod-full-portion",
              name: "Full Portion",
              price: 150,
              modifierGroupId: "group-portion",
              modifierGroupName: "Portion Size",
            },
          ],
          unitPrice: 600,
          totalPrice: 1200,
          specialInstructions: "Less spicy please",
        },
      ],
      qrContext: {
        token: "tbl-terrace-1",
        type: "TABLE",
        identifier: "T-01",
        displayName: "Terrace Table 1",
        hotelId: "htl-1",
        hotelName: "The Grand Royal Palace & Resort",
        isActive: true,
      },
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <CheckoutForm />
      </QueryClientProvider>
    );
  };

  it("should validate cart and submit order with durable Idempotency-Key header", async () => {
    const orderService = getOrderService();

    // 1. Mock validateOrder success
    const validateSpy = vi.spyOn(orderService, "validateOrder").mockResolvedValueOnce({
      success: true,
      data: {
        isValid: true,
        unavailableItems: [],
        priceDiscrepancies: [],
        calculatedSubtotal: 1200,
        calculatedTax: 60,
        calculatedGrandTotal: 1260,
      },
    });

    // 2. Mock createOrder success with authoritative backend values
    const createSpy = vi.spyOn(orderService, "createOrder").mockResolvedValueOnce({
      success: true,
      data: {
        id: "ord-authoritative-999",
        orderNumber: "ORD-20261011-0001",
        qrContext: {
          token: "tbl-terrace-1",
          type: "TABLE",
          identifier: "T-01",
          displayName: "Terrace Table 1",
          hotelId: "htl-1",
          hotelName: "The Grand Royal Palace & Resort",
          isActive: true,
        },
        status: "CONFIRMED",
        source: "CUSTOMER_QR",
        paymentPreference: "PAY_NOW",
        subtotal: 1200,
        taxTotal: 60,
        discountTotal: 0,
        grandTotal: 1260, // Authoritative price computed on PostgreSQL
        items: [],
        timeline: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    renderComponent();

    // 3. Submit form
    const submitBtn = screen.getByRole("button", { name: /Pay & Place Order/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(validateSpy).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledTimes(1);
    });

    // 4. Verify that an Idempotency-Key was generated and passed
    const passedOptions = createSpy.mock.calls[0][1];
    expect(passedOptions?.idempotencyKey).toBeDefined();
    expect(typeof passedOptions?.idempotencyKey).toBe("string");
    expect(passedOptions?.idempotencyKey?.length).toBeGreaterThan(10);

    // 5. Verify redirect to authoritative tracking page
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/order/ord-authoritative-999");
    });

    // 6. Verify cart was cleared
    expect(useCartStore.getState().items.length).toBe(0);
  });

  it("should handle unavailable items returned by backend cart validation without creating order", async () => {
    const orderService = getOrderService();

    vi.spyOn(orderService, "validateOrder").mockResolvedValueOnce({
      success: true,
      data: {
        isValid: false,
        unavailableItems: [
          { menuItemId: "item-butter-chicken-1", reason: "Makhani Butter Chicken is 86'd (Sold Out)" },
        ],
        priceDiscrepancies: [],
        calculatedSubtotal: 0,
        calculatedTax: 0,
        calculatedGrandTotal: 0,
      },
    });

    const createSpy = vi.spyOn(orderService, "createOrder");

    renderComponent();

    const submitBtn = screen.getByRole("button", { name: /Pay & Place Order/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/Unavailable items detected/i)).toBeInTheDocument();
    });

    // Create order should NOT have been called
    expect(createSpy).not.toHaveBeenCalled();
    // Cart should NOT be cleared
    expect(useCartStore.getState().items.length).toBe(1);
  });

  it("should reuse the exact same idempotency key when retrying after a network failure", async () => {
    const orderService = getOrderService();

    // 1. Validation succeeds
    vi.spyOn(orderService, "validateOrder").mockResolvedValue({
      success: true,
      data: {
        isValid: true,
        unavailableItems: [],
        priceDiscrepancies: [],
        calculatedSubtotal: 1200,
        calculatedTax: 60,
        calculatedGrandTotal: 1260,
      },
    });

    // 2. First attempt fails due to network drop
    const createSpy = vi
      .spyOn(orderService, "createOrder")
      .mockResolvedValueOnce({
        success: false,
        data: null as any,
        error: {
          code: "NETWORK_ERROR",
          message: "Network connection lost",
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: "ord-recovered-001",
          orderNumber: "ORD-20261011-0002",
          qrContext: {
            token: "tbl-terrace-1",
            type: "TABLE",
            identifier: "T-01",
            displayName: "Terrace Table 1",
            hotelId: "htl-1",
            hotelName: "The Grand Royal Palace & Resort",
            isActive: true,
          },
          status: "CONFIRMED",
          source: "CUSTOMER_QR",
          paymentPreference: "PAY_NOW",
          subtotal: 1200,
          taxTotal: 60,
          discountTotal: 0,
          grandTotal: 1260,
          items: [],
          timeline: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });

    renderComponent();

    const submitBtn = screen.getByRole("button", { name: /Pay & Place Order/i });
    fireEvent.click(submitBtn);

    // Alert with Retry button appears
    await waitFor(() => {
      expect(screen.getByText(/Retry Submission/i)).toBeInTheDocument();
    });

    const firstKey = createSpy.mock.calls[0][1]?.idempotencyKey;
    expect(firstKey).toBeDefined();

    // User clicks "Retry Submission"
    const retryBtn = screen.getByText(/Retry Submission/i);
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledTimes(2);
    });

    const secondKey = createSpy.mock.calls[1][1]?.idempotencyKey;
    // Critical idempotency invariant: Key MUST be identical!
    expect(secondKey).toBe(firstKey);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/order/ord-recovered-001");
    });
  });

  it("should handle backend 409 IDEMPOTENCY_IN_PROGRESS safely", async () => {
    const orderService = getOrderService();

    vi.spyOn(orderService, "validateOrder").mockResolvedValueOnce({
      success: true,
      data: {
        isValid: true,
        unavailableItems: [],
        priceDiscrepancies: [],
        calculatedSubtotal: 1200,
        calculatedTax: 60,
        calculatedGrandTotal: 1260,
      },
    });

    vi.spyOn(orderService, "createOrder").mockResolvedValueOnce({
      success: false,
      data: null as any,
      error: {
        code: "IDEMPOTENCY_IN_PROGRESS",
        message: "Request currently in progress",
      },
    });

    renderComponent();

    const submitBtn = screen.getByRole("button", { name: /Pay & Place Order/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/currently being processed/i)).toBeInTheDocument();
    });
  });

  it("should properly deduplicate identical incoming websocket frames by id", () => {
    const handler = vi.fn();
    const unsub = webSocketManager.subscribe("ORDER_CREATED", handler, "orders:all");

    // Frame 1
    webSocketManager.dispatchSimulatedEvent(
      "ORDER_CREATED",
      { orderNumber: "ORD-999" },
      "orders:all"
    );

    expect(handler).toHaveBeenCalledTimes(1);

    // Manually inject duplicate message with identical message id
    (webSocketManager as any).handleIncomingMessage({
      id: "dup-msg-id-123",
      type: "ORDER_CREATED",
      topic: "orders:all",
      payload: { orderNumber: "ORD-999" },
      timestamp: new Date().toISOString(),
    });
    expect(handler).toHaveBeenCalledTimes(2);

    // Replay the exact same frame again
    (webSocketManager as any).handleIncomingMessage({
      id: "dup-msg-id-123",
      type: "ORDER_CREATED",
      topic: "orders:all",
      payload: { orderNumber: "ORD-999" },
      timestamp: new Date().toISOString(),
    });

    // Should NOT have triggered handler a 3rd time
    expect(handler).toHaveBeenCalledTimes(2);

    unsub();
  });
});
