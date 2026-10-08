import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OrdersList } from "@/features/orders/OrdersList";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/orders",
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

describe("OrdersList Component (Phase 8 Staff)", () => {
  it("should render order filter tabs and search bar", () => {
    renderWithClient(<OrdersList />);

    expect(screen.getByRole("button", { name: "All Orders" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preparing" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Food Ready" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search order #, table.../i)).toBeInTheDocument();
  });
});
