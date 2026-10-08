import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TipSelector } from "@/features/billing/TipSelector";

describe("TipSelector Component (Phase 5 E-Bill)", () => {
  it("should render preset buttons with calculated amounts", () => {
    const handleTipChange = vi.fn();
    render(
      <TipSelector
        baseAmount={1000}
        selectedTip={0}
        onTipChange={handleTipChange}
      />
    );

    expect(screen.getByRole("button", { name: /No Tip/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /5%/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /10%/i })).toBeInTheDocument();
  });

  it("should trigger onTipChange with 10% amount when 10% preset is clicked", () => {
    const handleTipChange = vi.fn();
    render(
      <TipSelector
        baseAmount={1000}
        selectedTip={0}
        onTipChange={handleTipChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /10%/i }));
    // 10% of 1000 = 100
    expect(handleTipChange).toHaveBeenCalledWith(100);
  });
});
