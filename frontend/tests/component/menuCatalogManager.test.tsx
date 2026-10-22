import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MenuCatalogManager } from "@/features/admin/MenuCatalogManager";

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

describe("MenuCatalogManager Component (Phase 9 Admin)", () => {
  it("should render catalog search bar and categories filter", async () => {
    renderWithClient(<MenuCatalogManager />);

    expect(
      await screen.findByPlaceholderText(/Search dish or ingredient.../i)
    ).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /All Items/i })).toBeInTheDocument();
  });
});
