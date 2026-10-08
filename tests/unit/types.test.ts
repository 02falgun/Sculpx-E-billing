import { describe, it, expect } from "vitest";
import { qrContextSchema, createOrderSchema } from "@/schemas";

describe("Phase 0 Architecture - Schemas & Type Contracts", () => {
  it("should validate a valid Room QR context", () => {
    const validRoomContext = {
      token: "room-token-301",
      type: "ROOM",
      identifier: "301",
      displayName: "Room 301",
      hotelId: "hotel-grand-1",
      hotelName: "Grand Palace Hotel",
      isActive: true,
    };

    const parsed = qrContextSchema.safeParse(validRoomContext);
    expect(parsed.success).toBe(true);
  });

  it("should validate a valid Table QR context", () => {
    const validTableContext = {
      token: "tbl-token-12",
      type: "TABLE",
      identifier: "12",
      displayName: "Table 12",
      hotelId: "hotel-grand-1",
      hotelName: "Grand Palace Hotel",
      locationDetails: {
        floor: "1st Floor",
        section: "Main Dining",
        capacity: 4,
      },
      isActive: true,
    };

    const parsed = qrContextSchema.safeParse(validTableContext);
    expect(parsed.success).toBe(true);
  });

  it("should reject an order with an empty item list", () => {
    const invalidOrder = {
      qrToken: "room-token-301",
      paymentPreference: "PAY_NOW",
      items: [],
    };

    const parsed = createOrderSchema.safeParse(invalidOrder);
    expect(parsed.success).toBe(false);
  });
});
