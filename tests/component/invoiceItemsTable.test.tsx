import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InvoiceItemsTable } from "@/features/billing/InvoiceItemsTable";
import { Bill } from "@/types";

describe("InvoiceItemsTable Component (Phase 5 E-Bill)", () => {
  const mockBill: Bill = {
    id: "bill-test-1",
    billNumber: "INV-2026-1001",
    orderId: "ord-1001",
    orderNumber: "ORD-2026-1001",
    qrContext: {
      token: "table-token-5",
      type: "TABLE",
      identifier: "5",
      displayName: "Table 5",
      hotelId: "htl-1",
      hotelName: "Grand Palace",
      isActive: true,
    },
    status: "ISSUED",
    items: [
      {
        id: "bi-1",
        name: "Wild Mushroom & Burrata Pizza",
        quantity: 1,
        unitPrice: 560,
        totalPrice: 560,
      },
      {
        id: "bi-2",
        name: "Nitro Cold Brew",
        quantity: 2,
        unitPrice: 220,
        totalPrice: 440,
      },
    ],
    subtotal: 1000,
    discounts: [],
    totalDiscount: 0,
    taxes: [
      { name: "CGST (2.5%)", ratePercentage: 2.5, amount: 25 },
      { name: "SGST (2.5%)", ratePercentage: 2.5, amount: 25 },
    ],
    totalTax: 50,
    roundOff: 0,
    grandTotal: 1050,
    paidAmount: 0,
    dueAmount: 1050,
    payments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("should render itemized rows with quantities, unit price, and total", () => {
    render(<InvoiceItemsTable bill={mockBill} />);

    expect(screen.getByText("Wild Mushroom & Burrata Pizza")).toBeInTheDocument();
    expect(screen.getByText("Nitro Cold Brew")).toBeInTheDocument();
    expect(screen.getByText("CGST (2.5%)")).toBeInTheDocument();
    expect(screen.getByText("SGST (2.5%)")).toBeInTheDocument();
    expect(screen.getByText(/Net Payable Due/i)).toBeInTheDocument();
  });

  it("should dynamically calculate net payable due when tip is added", () => {
    render(<InvoiceItemsTable bill={mockBill} tipAmount={50} />);

    expect(screen.getByText(/Added Gratuity \/ Tip/i)).toBeInTheDocument();
    expect(screen.getByText(/1,100/)).toBeInTheDocument();
  });
});
