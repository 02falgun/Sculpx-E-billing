import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/components/shared/StatusBadge";

describe("StatusBadge Component (Phase 1 Foundation)", () => {
  it("should render localized label for OrderStatus PREPARING", () => {
    render(<StatusBadge status="PREPARING" type="order" />);
    expect(screen.getByText(/Preparing in Kitchen/i)).toBeInTheDocument();
  });

  it("should render localized label for BillStatus PAID", () => {
    render(<StatusBadge status="PAID" type="bill" />);
    expect(screen.getByText(/Paid & Settled/i)).toBeInTheDocument();
  });

  it("should render localized label for KOTStatus READY", () => {
    render(<StatusBadge status="READY" type="kot" />);
    expect(screen.getByText(/Ready for Pickup/i)).toBeInTheDocument();
  });
});
