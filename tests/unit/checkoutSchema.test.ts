import { describe, it, expect } from "vitest";
import { checkoutFormSchema } from "@/schemas/checkout.schema";

describe("Checkout Schema Validation (Phase 3 Cart & Checkout)", () => {
  it("should validate valid checkout input with PAY_NOW", () => {
    const validData = {
      customerName: "Aarav Gupta",
      customerPhone: "9876543210",
      specialInstructions: "Make extra spicy",
      paymentPreference: "PAY_NOW",
    };

    const res = checkoutFormSchema.safeParse(validData);
    expect(res.success).toBe(true);
  });

  it("should validate checkout input with empty optional fields", () => {
    const minimalData = {
      customerName: "",
      customerPhone: "",
      specialInstructions: "",
      paymentPreference: "PAY_LATER",
    };

    const res = checkoutFormSchema.safeParse(minimalData);
    expect(res.success).toBe(true);
  });

  it("should reject invalid phone numbers (non-10-digit)", () => {
    const invalidPhoneData = {
      customerPhone: "12345", // too short
      paymentPreference: "PAY_NOW",
    };

    const res = checkoutFormSchema.safeParse(invalidPhoneData);
    expect(res.success).toBe(false);
  });

  it("should reject missing or invalid payment preference", () => {
    const invalidPreference = {
      customerName: "John",
      paymentPreference: "INVALID_CHOICE",
    };

    const res = checkoutFormSchema.safeParse(invalidPreference);
    expect(res.success).toBe(false);
  });
});
