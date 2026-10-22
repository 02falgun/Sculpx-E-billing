import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button } from "@/components/ui/Button";

describe("Button Component (Phase 1 Foundation)", () => {
  it("should render button with children text", () => {
    render(<Button>Confirm Order</Button>);
    expect(screen.getByRole("button", { name: /confirm order/i })).toBeInTheDocument();
  });

  it("should trigger onClick handler when clicked", () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    fireEvent.click(screen.getByRole("button", { name: /click me/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("should disable button when isLoading is true", () => {
    render(<Button isLoading>Submitting</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });
});
