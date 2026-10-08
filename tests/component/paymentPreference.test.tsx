import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PaymentPreferenceSelector } from "@/features/checkout/PaymentPreferenceSelector";
import { QRContext } from "@/types";

describe("PaymentPreferenceSelector Component (Phase 3)", () => {
  const roomContext: QRContext = {
    token: "room-token-301",
    type: "ROOM",
    identifier: "301",
    displayName: "Room 301",
    hotelId: "htl-1",
    hotelName: "Grand Palace",
    isActive: true,
  };

  const tableContext: QRContext = {
    token: "table-token-5",
    type: "TABLE",
    identifier: "5",
    displayName: "Table 5",
    hotelId: "htl-1",
    hotelName: "Grand Palace",
    isActive: true,
  };

  it("should display 'Post to Room Folio' when context is ROOM", () => {
    render(
      <PaymentPreferenceSelector
        value="PAY_LATER"
        onChange={vi.fn()}
        context={roomContext}
      />,
    );

    expect(screen.getByText("Post to Room Folio")).toBeInTheDocument();
    expect(screen.getByText(/Room 301 folio/i)).toBeInTheDocument();
  });

  it("should display 'Pay Later at Table' when context is TABLE", () => {
    render(
      <PaymentPreferenceSelector
        value="PAY_LATER"
        onChange={vi.fn()}
        context={tableContext}
      />,
    );

    expect(screen.getByText("Pay Later at Table")).toBeInTheDocument();
    expect(screen.getByText(/floor staff/i)).toBeInTheDocument();
  });

  it("should trigger onChange when user clicks payment option", () => {
    const handleChange = vi.fn();
    render(
      <PaymentPreferenceSelector
        value="PAY_LATER"
        onChange={handleChange}
        context={tableContext}
      />,
    );

    const payNowBtn = screen.getByText("Pay Now Online");
    fireEvent.click(payNowBtn);

    expect(handleChange).toHaveBeenCalledWith("PAY_NOW");
  });
});
