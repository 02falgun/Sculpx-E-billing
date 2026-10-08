import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrderStatusTimeline } from "@/features/order/OrderStatusTimeline";
import { Order } from "@/types";

describe("OrderStatusTimeline Component (Phase 4)", () => {
  const baseOrder: Order = {
    id: "ord-test-1",
    orderNumber: "ORD-2026-9999",
    qrContext: {
      token: "table-token-5",
      type: "TABLE",
      identifier: "5",
      displayName: "Table 5",
      hotelId: "htl-1",
      hotelName: "Grand Palace",
      isActive: true,
    },
    status: "PREPARING",
    source: "CUSTOMER_QR",
    paymentPreference: "PAY_LATER",
    items: [],
    subtotal: 500,
    taxTotal: 25,
    discountTotal: 0,
    grandTotal: 525,
    timeline: [
      {
        status: "PLACED",
        timestamp: new Date().toISOString(),
      },
      {
        status: "CONFIRMED",
        timestamp: new Date().toISOString(),
      },
      {
        status: "PREPARING",
        timestamp: new Date().toISOString(),
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("should render all main timeline stages", () => {
    render(<OrderStatusTimeline order={baseOrder} />);

    expect(screen.getByText("Order Placed")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByText("Preparing")).toBeInTheDocument();
    expect(screen.getByText("Food Ready")).toBeInTheDocument();
    expect(screen.getByText("Served")).toBeInTheDocument();
  });

  it("should display estimated cooking wait time during PREPARING stage", () => {
    render(<OrderStatusTimeline order={baseOrder} />);

    expect(screen.getByText(/Cooking underway/i)).toBeInTheDocument();
  });

  it("should render cancelled banner when order is CANCELLED", () => {
    const cancelledOrder: Order = {
      ...baseOrder,
      status: "CANCELLED",
      cancellation: {
        reason: "Customer changed plans",
        cancelledAt: new Date().toISOString(),
        cancelledBy: "CUSTOMER",
        refundStatus: "NOT_APPLICABLE",
      },
    };

    render(<OrderStatusTimeline order={cancelledOrder} />);

    expect(screen.getByText(/This order was cancelled/i)).toBeInTheDocument();
    expect(screen.getByText(/Customer changed plans/i)).toBeInTheDocument();
  });
});
