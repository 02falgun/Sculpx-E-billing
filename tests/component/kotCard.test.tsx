import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { KOTCard } from "@/features/kitchen/KOTCard";
import { KOT } from "@/types";

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe("KOTCard Component (Phase 7 KDS)", () => {
  const mockKOT: KOT = {
    id: "kot-1042",
    kotNumber: "1042",
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
    items: [
      {
        id: "koti-1",
        menuItemId: "item-paneer-tikka",
        name: "Royal Tandoori Paneer Tikka",
        quantity: 2,
        modifiers: [{ name: "Mild Spiced" }],
        specialInstructions: "Less oil",
        status: "PREPARING",
      },
    ],
    status: "PREPARING",
    urgency: "NORMAL",
    specialNotes: "VIP Guest",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("should render ticket number, order number, table context, items and notes", () => {
    renderWithClient(<KOTCard kot={mockKOT} />);

    expect(screen.getByText("#1042")).toBeInTheDocument();
    expect(screen.getByText("(ORD-2026-1001)")).toBeInTheDocument();
    expect(screen.getByText(/Table 5/i)).toBeInTheDocument();
    expect(screen.getByText(/2x/)).toBeInTheDocument();
    expect(screen.getByText(/Royal Tandoori Paneer Tikka/)).toBeInTheDocument();
    expect(screen.getByText(/Mild Spiced/)).toBeInTheDocument();
    expect(screen.getByText(/VIP Guest/)).toBeInTheDocument();
  });

  it("should strike through item when clicked by chef", () => {
    renderWithClient(<KOTCard kot={mockKOT} />);

    const itemRow = screen.getByText(/Royal Tandoori Paneer Tikka/).closest("div[class*='cursor-pointer']");
    expect(itemRow).toBeInTheDocument();

    if (itemRow) {
      fireEvent.click(itemRow);
      expect(itemRow).toHaveClass("line-through");
    }
  });

  it("should render Mark Ready to Serve action button during PREPARING stage", () => {
    renderWithClient(<KOTCard kot={mockKOT} />);

    expect(
      screen.getByRole("button", { name: /Mark Ready to Serve/i })
    ).toBeInTheDocument();
  });
});
