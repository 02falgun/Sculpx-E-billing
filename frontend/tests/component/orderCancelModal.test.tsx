import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { OrderCancelModal } from "@/features/order/OrderCancelModal";

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

describe("OrderCancelModal Component (Phase 4)", () => {
  it("should not render when isOpen is false", () => {
    const handleClose = vi.fn();
    renderWithClient(
      <OrderCancelModal
        orderId="ord-1001"
        orderNumber="ORD-2026-1001"
        isOpen={false}
        onClose={handleClose}
      />
    );

    expect(screen.queryByText(/Cancel Order Confirmation/i)).not.toBeInTheDocument();
  });

  it("should render modal with order number and reasons when isOpen is true", () => {
    const handleClose = vi.fn();
    renderWithClient(
      <OrderCancelModal
        orderId="ord-1001"
        orderNumber="ORD-2026-1001"
        isOpen={true}
        onClose={handleClose}
      />
    );

    expect(screen.getByText(/Cancel Order Confirmation/i)).toBeInTheDocument();
    expect(screen.getByText(/ORD-2026-1001/i)).toBeInTheDocument();
    expect(screen.getByText(/Wait time is too long/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Keep My Order/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Yes, Cancel Order/i })).toBeInTheDocument();
  });

  it("should trigger onClose when clicking Keep My Order", () => {
    const handleClose = vi.fn();
    renderWithClient(
      <OrderCancelModal
        orderId="ord-1001"
        orderNumber="ORD-2026-1001"
        isOpen={true}
        onClose={handleClose}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Keep My Order/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
