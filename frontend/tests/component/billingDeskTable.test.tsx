import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BillingDeskTable } from "@/features/desk/BillingDeskTable";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/billing",
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

describe("BillingDeskTable Component (Phase 8 Staff)", () => {
  it("should render metric cards and filter buttons", () => {
    renderWithClient(<BillingDeskTable />);

    expect(screen.getByText("Outstanding / Due Balance")).toBeInTheDocument();
    expect(screen.getByText("Collected Today")).toBeInTheDocument();
    expect(screen.getByText("Total Bills Issued")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search invoice #, table.../i)).toBeInTheDocument();
  });
});
