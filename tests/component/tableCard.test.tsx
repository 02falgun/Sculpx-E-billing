import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TableCard } from "@/features/staff/TableCard";
import { Table } from "@/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

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

describe("TableCard Component (Phase 6 Staff)", () => {
  const dummyTable: Table = {
    id: "tbl-5",
    tableNumber: "5",
    section: "Main Dining",
    capacity: 4,
    status: "AVAILABLE",
    qrToken: "table-token-5",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it("should render table number, capacity, section and available status", () => {
    renderWithClient(<TableCard table={dummyTable} />);

    expect(screen.getByText("Table 5")).toBeInTheDocument();
    expect(screen.getByText("Main Dining")).toBeInTheDocument();
    expect(screen.getByText(/Cap: 4 Guests/i)).toBeInTheDocument();
    expect(screen.getByText("Available")).toBeInTheDocument();
  });

  it("should render New Order button for available tables", () => {
    renderWithClient(<TableCard table={dummyTable} />);

    expect(screen.getByRole("button", { name: /New Order/i })).toBeInTheDocument();
  });

  it("should display active session indicator when table is OCCUPIED", () => {
    const occupiedTable: Table = {
      ...dummyTable,
      status: "OCCUPIED",
      activeOrderId: "ord-1001",
    };

    renderWithClient(<TableCard table={occupiedTable} />);

    expect(screen.getByText("Occupied")).toBeInTheDocument();
    expect(screen.getByText(/Active Session/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add to Order/i })).toBeInTheDocument();
  });
});
