import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KOTTimer } from "@/features/kitchen/KOTTimer";

describe("KOTTimer Component (Phase 7 KDS)", () => {
  it("should render elapsed time for a recently created KOT", () => {
    const recently = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    render(<KOTTimer createdAt={recently} />);

    // Should display roughly 3 minutes
    expect(screen.getByText(/3:/)).toBeInTheDocument();
  });

  it("should render urgent styling when KOT is older than 15 minutes", () => {
    const overdue = new Date(Date.now() - 16 * 60 * 1000).toISOString();
    const { container } = render(<KOTTimer createdAt={overdue} />);

    expect(screen.getByText(/16:/)).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("text-rose-400");
  });
});
