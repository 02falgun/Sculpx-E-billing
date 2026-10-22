import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrderItemsReview } from "@/features/order/OrderItemsReview";
import { Order } from "@/types";

describe("OrderItemsReview Component (Phase 4)", () => {
  const tableOrder: Order = {
    id: "ord-test-2",
    orderNumber: "ORD-2026-8888",
    qrContext: {
      token: "table-token-5",
      type: "TABLE",
      identifier: "5",
      displayName: "Table 5",
      hotelId: "htl-1",
      hotelName: "Grand Palace",
      isActive: true,
    },
    status: "CONFIRMED",
    source: "CUSTOMER_QR",
    paymentPreference: "PAY_LATER",
    items: [
      {
        id: "oi-1",
        menuItemId: "item-biryani",
        name: "Awadhi Dum Biryani",
        quantity: 2,
        unitPrice: 450,
        totalPrice: 900,
        taxRatePercentage: 5,
        taxAmount: 45,
        modifiers: [{ modifierId: "mod-raita", name: "Burani Garlic Raita", price: 40 }],
        specialInstructions: "Extra salan please",
        status: "PLACED",
      },
    ],
    subtotal: 900,
    taxTotal: 45,
    discountTotal: 50,
    grandTotal: 895,
    timeline: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("should render item details, quantity, modifier, and instructions", () => {
    render(<OrderItemsReview order={tableOrder} />);

    expect(screen.getByText(/2x Awadhi Dum Biryani/i)).toBeInTheDocument();
    expect(screen.getByText(/Burani Garlic Raita/i)).toBeInTheDocument();
    expect(screen.getByText(/Extra salan please/i)).toBeInTheDocument();
  });

  it("should render totals including subtotal, GST, discount, and grand total", () => {
    render(<OrderItemsReview order={tableOrder} />);

    expect(screen.getByText(/Subtotal/i)).toBeInTheDocument();
    expect(screen.getByText(/Estimated GST \(5%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Special Discount/i)).toBeInTheDocument();
    expect(screen.getByText(/Total Payable/i)).toBeInTheDocument();
  });

  it("should show room folio badge when QR context is room", () => {
    const roomOrder: Order = {
      ...tableOrder,
      qrContext: {
        token: "room-token-301",
        type: "ROOM",
        identifier: "301",
        displayName: "Room 301",
        hotelId: "htl-1",
        hotelName: "Grand Palace",
        isActive: true,
      },
    };

    render(<OrderItemsReview order={roomOrder} />);

    expect(screen.getByText(/Room 301 Folio/i)).toBeInTheDocument();
  });
});
