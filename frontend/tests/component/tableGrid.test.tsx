import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TableGrid } from "@/features/staff/TableGrid";
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

describe("TableGrid Component (Phase 6 Staff)", () => {
  const mockTables: Table[] = [
    {
      id: "tbl-1",
      tableNumber: "1",
      section: "Main Dining",
      capacity: 2,
      status: "AVAILABLE",
      qrToken: "token-1",
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "tbl-5",
      tableNumber: "5",
      section: "Main Dining",
      capacity: 4,
      status: "OCCUPIED",
      qrToken: "token-5",
      createdAt: "",
      updatedAt: "",
    },
    {
      id: "tbl-8",
      tableNumber: "8",
      section: "Terrace Bar",
      capacity: 6,
      status: "RESERVED",
      qrToken: "token-8",
      createdAt: "",
      updatedAt: "",
    },
  ];

  it("should render correct metric counters for total, available, occupied, and reserved", () => {
    renderWithClient(<TableGrid tables={mockTables} />);

    expect(screen.getByText("Total Tables")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument(); // total 3
    expect(screen.getAllByText("Available").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Occupied").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Reserved").length).toBeGreaterThanOrEqual(1);
  });

  it("should filter tables when clicking section tab", () => {
    renderWithClient(<TableGrid tables={mockTables} />);

    // Click "Terrace Bar" tab
    fireEvent.click(screen.getByRole("button", { name: "Terrace Bar" }));

    expect(screen.getByText("Table 8")).toBeInTheDocument();
    expect(screen.queryByText("Table 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Table 5")).not.toBeInTheDocument();
  });
});
