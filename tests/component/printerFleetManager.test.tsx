import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PrinterFleetManager } from "@/features/admin/PrinterFleetManager";

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

describe("PrinterFleetManager Component (Phase 9 Admin)", () => {
  it("should render hardware printer fleet management headers", async () => {
    renderWithClient(<PrinterFleetManager />);

    expect(
      await screen.findByText(/Recent Hardware Print Queue/i)
    ).toBeInTheDocument();
  });
});
