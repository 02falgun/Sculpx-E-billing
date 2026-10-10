import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

const TEST_TENANT_A = "e1b1d1f0-0000-4000-8000-000000000001";
const TEST_TENANT_B = "00000000-0000-4000-8000-000000000099";

describe("SCULPX E-Billing — Phase 3B.2 Pre-Checkout Cart Validation Tests", () => {
  let app: FastifyInstance;

  // Fixture IDs
  let tableAId: string;
  let roomAId: string;
  let categoryAId: string;
  let validItemId: string;
  let unavailableItemId: string;
  let foreignCategoryBId: string;
  let foreignItemId: string;

  let portionGroupId: string;
  let halfOptionId: string;
  let fullOptionId: string;

  let addonGroupId: string;
  let gravyOptionId: string;
  let butterOptionId: string; // sold out option

  const validTableQr = `test-cart-table-qr-${Date.now()}`;
  const validRoomQr = `test-cart-room-qr-${Date.now()}`;
  const inactiveQr = `test-cart-inactive-qr-${Date.now()}`;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    // 1. Table & Room Fixtures in Tenant A
    const tableA = await prisma.table.create({
      data: {
        tenantId: TEST_TENANT_A,
        tableNumber: "T-CART-1",
        displayName: "Terrace Table 1",
        capacity: 4,
        section: "Terrace Bar",
      },
    });
    tableAId = tableA.id;

    const roomA = await prisma.room.create({
      data: {
        tenantId: TEST_TENANT_A,
        roomNumber: "201",
        floor: "2nd Floor",
        guestName: "Secret VIP",
        folioId: "FOLIO-SECRET",
      },
    });
    roomAId = roomA.id;

    // 2. Seed QR records
    await prisma.qrCode.create({
      data: {
        tenantId: TEST_TENANT_A,
        token: validTableQr,
        type: "TABLE",
        tableId: tableAId,
        isActive: true,
      },
    });

    await prisma.qrCode.create({
      data: {
        tenantId: TEST_TENANT_A,
        token: validRoomQr,
        type: "ROOM",
        roomId: roomAId,
        isActive: true,
      },
    });

    await prisma.qrCode.create({
      data: {
        tenantId: TEST_TENANT_A,
        token: inactiveQr,
        type: "TABLE",
        tableId: tableAId,
        isActive: false,
      },
    });

    // 3. Category & Items in Tenant A
    const categoryA = await prisma.menuCategory.create({
      data: {
        tenantId: TEST_TENANT_A,
        name: "Cart Test Category",
      },
    });
    categoryAId = categoryA.id;

    // Available item with modifiers: Base price = 400.00, Tax = 5.00%
    const validItem = await prisma.menuItem.create({
      data: {
        categoryId: categoryAId,
        name: "Makhani Butter Chicken",
        price: 400.0,
        taxRatePercentage: 5.0,
        isAvailable: true,
      },
    });
    validItemId = validItem.id;

    // Portion Size Group (min: 1, max: 1, required)
    const portionGroup = await prisma.modifierGroup.create({
      data: {
        menuItemId: validItemId,
        name: "Portion Size",
        minSelections: 1,
        maxSelections: 1,
        isRequired: true,
      },
    });
    portionGroupId = portionGroup.id;

    const halfOpt = await prisma.modifierOption.create({
      data: {
        groupId: portionGroupId,
        name: "Half Portion",
        price: 0.0,
      },
    });
    halfOptionId = halfOpt.id;

    const fullOpt = await prisma.modifierOption.create({
      data: {
        groupId: portionGroupId,
        name: "Full Portion",
        price: 150.0,
      },
    });
    fullOptionId = fullOpt.id;

    // Addons Group (min: 0, max: 2, optional)
    const addonGroup = await prisma.modifierGroup.create({
      data: {
        menuItemId: validItemId,
        name: "Addons",
        minSelections: 0,
        maxSelections: 2,
        isRequired: false,
      },
    });
    addonGroupId = addonGroup.id;

    const gravyOpt = await prisma.modifierOption.create({
      data: {
        groupId: addonGroupId,
        name: "Extra Gravy",
        price: 50.0,
      },
    });
    gravyOptionId = gravyOpt.id;

    const butterOpt = await prisma.modifierOption.create({
      data: {
        groupId: addonGroupId,
        name: "Extra Butter",
        price: 30.0,
      },
    });
    butterOptionId = butterOpt.id;

    // Sold out (86'd) item in Tenant A
    const unavailableItem = await prisma.menuItem.create({
      data: {
        categoryId: categoryAId,
        name: "Tandoori Pomfret (Sold Out)",
        price: 650.0,
        taxRatePercentage: 5.0,
        isAvailable: false,
      },
    });
    unavailableItemId = unavailableItem.id;

    // 4. Foreign Category and Item in Tenant B
    const foreignCategoryB = await prisma.menuCategory.create({
      data: {
        tenantId: TEST_TENANT_B,
        name: "Tenant B Category",
      },
    });
    foreignCategoryBId = foreignCategoryB.id;

    const foreignItem = await prisma.menuItem.create({
      data: {
        categoryId: foreignCategoryBId,
        name: "Foreign Tenant Luxury Caviar",
        price: 2500.0,
        isAvailable: true,
      },
    });
    foreignItemId = foreignItem.id;
  });

  afterAll(async () => {
    // Clean up QR codes
    await prisma.qrCode.deleteMany({
      where: {
        token: { in: [validTableQr, validRoomQr, inactiveQr] },
      },
    });

    // Clean up tables & rooms
    if (tableAId) await prisma.table.delete({ where: { id: tableAId } }).catch(() => {});
    if (roomAId) await prisma.room.delete({ where: { id: roomAId } }).catch(() => {});

    // Clean up menu items (cascades modifier groups & options)
    if (validItemId) await prisma.menuItem.delete({ where: { id: validItemId } }).catch(() => {});
    if (unavailableItemId) await prisma.menuItem.delete({ where: { id: unavailableItemId } }).catch(() => {});
    if (foreignItemId) await prisma.menuItem.delete({ where: { id: foreignItemId } }).catch(() => {});

    // Clean up categories
    if (categoryAId) await prisma.menuCategory.delete({ where: { id: categoryAId } }).catch(() => {});
    if (foreignCategoryBId) await prisma.menuCategory.delete({ where: { id: foreignCategoryBId } }).catch(() => {});

    await app.close();
  });

  // =========================================================================
  // 1. Valid Cart Validation & Authoritative Price Arithmetic
  // =========================================================================
  describe("1. Valid Cart Validation & Authoritative Price Arithmetic", () => {
    it("should validate a table QR cart and calculate authoritative prices and Indian GST breakdown", async () => {
      // 2 portions of Butter Chicken (Base 400.00 + Full Portion 150.00 + Extra Gravy 50.00 = 600.00 per unit)
      // Line Subtotal = 600.00 * 2 = 1200.00
      // Tax: 5% of 1200.00 = 60.00 (CGST 2.5% = 30.00, SGST 2.5% = 30.00)
      // Grand Total = 1260.00
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders/validate",
        payload: {
          qrToken: validTableQr,
          items: [
            {
              menuItemId: validItemId,
              quantity: 2,
              modifierOptionIds: [fullOptionId, gravyOptionId],
              specialInstructions: "Less spicy please",
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.success).toBe(true);

      const data = json.data;
      expect(data.isValid).toBe(true);
      expect(data.unavailableItems).toHaveLength(0);

      // Context check
      expect(data.context.type).toBe("TABLE");
      expect(data.context.identifier).toBe("T-CART-1");
      expect(data.context.displayName).toBe("Terrace Table 1");

      // Line item check
      expect(data.lineItems).toHaveLength(1);
      const line = data.lineItems[0];
      expect(line.menuItemId).toBe(validItemId);
      expect(line.name).toBe("Makhani Butter Chicken");
      expect(line.quantity).toBe(2);
      expect(line.unitBasePrice).toBe(400.0);
      expect(line.modifiersSubtotal).toBe(200.0); // 150 + 50
      expect(line.unitPrice).toBe(600.0);
      expect(line.lineSubtotal).toBe(1200.0);
      expect(line.taxRate).toBe(5.0);
      expect(line.taxAmount).toBe(60.0);
      expect(line.lineTotal).toBe(1260.0);
      expect(line.modifiers).toHaveLength(2);

      // Authoritative totals check
      expect(data.pricing.itemsSubtotal).toBe(800.0); // 400 * 2
      expect(data.pricing.modifiersSubtotal).toBe(400.0); // 200 * 2
      expect(data.pricing.taxableSubtotal).toBe(1200.0);
      expect(data.pricing.taxBreakdown.cgstRate).toBe(2.5);
      expect(data.pricing.taxBreakdown.cgstAmount).toBe(30.0);
      expect(data.pricing.taxBreakdown.sgstRate).toBe(2.5);
      expect(data.pricing.taxBreakdown.sgstAmount).toBe(30.0);
      expect(data.pricing.taxBreakdown.totalTax).toBe(60.0);
      expect(data.pricing.grandTotal).toBe(1260.0);

      // 1:1 frontend contract aliases check
      expect(data.calculatedSubtotal).toBe(1200.0);
      expect(data.calculatedTax).toBe(60.0);
      expect(data.calculatedGrandTotal).toBe(1260.0);
    });

    it("should validate a room QR cart successfully", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders/validate",
        payload: {
          qrToken: validRoomQr,
          items: [
            {
              menuItemId: validItemId,
              quantity: 1,
              modifierIds: [halfOptionId], // Testing modifierIds alias
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.success).toBe(true);
      expect(json.data.isValid).toBe(true);
      expect(json.data.context.type).toBe("ROOM");
      expect(json.data.context.identifier).toBe("201");
      expect(json.data.calculatedSubtotal).toBe(400.0);
      expect(json.data.calculatedTax).toBe(20.0);
      expect(json.data.calculatedGrandTotal).toBe(420.0);
    });
  });

  // =========================================================================
  // 2. Client Price Tampering & Discrepancy Detection
  // =========================================================================
  describe("2. Client Price Tampering & Discrepancy Detection", () => {
    it("should ignore client-supplied manipulated price and report discrepancy", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders/validate",
        payload: {
          qrToken: validTableQr,
          items: [
            {
              menuItemId: validItemId,
              quantity: 1,
              modifierOptionIds: [halfOptionId],
              clientPrice: 1.0, // Client attempts to claim unit price is ₹1.00 instead of ₹400.00
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.success).toBe(true);

      // Server enforces true price
      expect(json.data.calculatedSubtotal).toBe(400.0);
      expect(json.data.calculatedGrandTotal).toBe(420.0);

      // Discrepancy logged
      expect(json.data.priceDiscrepancies).toHaveLength(1);
      expect(json.data.priceDiscrepancies[0]).toEqual({
        menuItemId: validItemId,
        clientPrice: 1.0,
        serverPrice: 400.0,
      });
    });
  });

  // =========================================================================
  // 3. Modifier Cardinality & Availability Rule Violations
  // =========================================================================
  describe("3. Modifier Cardinality & Availability Rule Violations", () => {
    it("should fail validation when required modifier group has zero selections", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders/validate",
        payload: {
          qrToken: validTableQr,
          items: [
            {
              menuItemId: validItemId,
              quantity: 1,
              modifierOptionIds: [], // Missing required 'Portion Size' (min: 1)
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.isValid).toBe(false);
      expect(json.data.unavailableItems.length).toBeGreaterThan(0);
      expect(json.data.unavailableItems[0].reason).toContain("Portion Size");
    });

    it("should fail validation when modifier group exceeds max selections", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders/validate",
        payload: {
          qrToken: validTableQr,
          items: [
            {
              menuItemId: validItemId,
              quantity: 1,
              modifierOptionIds: [halfOptionId, fullOptionId], // Exceeds maxSelections: 1
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.isValid).toBe(false);
      expect(json.data.unavailableItems.some((u: any) => u.reason.includes("allows at most 1"))).toBe(true);
    });

    it("should fail validation when a selected modifier option is invalid or not attached to the item", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders/validate",
        payload: {
          qrToken: validTableQr,
          items: [
            {
              menuItemId: validItemId,
              quantity: 1,
              modifierOptionIds: [halfOptionId, "00000000-0000-0000-0000-000000000999"], // Unattached / invalid modifier option
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.isValid).toBe(false);
      expect(json.data.unavailableItems.some((u: any) => u.reason.includes("is not valid for item"))).toBe(true);
    });
  });

  // =========================================================================
  // 4. Unavailable Items, Unknown Items & Cross-Tenant Boundary
  // =========================================================================
  describe("4. Unavailable Items, Unknown Items & Cross-Tenant Boundary", () => {
    it("should flag 86'd (unavailable) menu items in the cart", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders/validate",
        payload: {
          qrToken: validTableQr,
          items: [
            {
              menuItemId: unavailableItemId,
              quantity: 1,
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.isValid).toBe(false);
      expect(json.data.unavailableItems).toHaveLength(1);
      expect(json.data.unavailableItems[0].menuItemId).toBe(unavailableItemId);
      expect(json.data.unavailableItems[0].reason).toContain("unavailable");
    });

    it("should reject an unknown menu item UUID without leaking database internals", async () => {
      const unknownUuid = "00000000-0000-0000-0000-000000000999";
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders/validate",
        payload: {
          qrToken: validTableQr,
          items: [
            {
              menuItemId: unknownUuid,
              quantity: 1,
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.isValid).toBe(false);
      expect(json.data.unavailableItems[0].menuItemId).toBe(unknownUuid);
    });

    it("should prevent cross-tenant menu item access", async () => {
      // Cart created at Tenant A table containing item from Tenant B
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders/validate",
        payload: {
          qrToken: validTableQr,
          items: [
            {
              menuItemId: foreignItemId,
              quantity: 1,
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.data.isValid).toBe(false);
      expect(json.data.unavailableItems[0].menuItemId).toBe(foreignItemId);

      // Verify no leak of Tenant B
      expect(res.payload).not.toContain(TEST_TENANT_B);
      expect(res.payload).not.toContain("Foreign Tenant Luxury Caviar");
    });
  });

  // =========================================================================
  // 5. QR Context Verification Failures
  // =========================================================================
  describe("5. QR Context Verification Failures", () => {
    it("should return HTTP 404 when QR token does not exist", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders/validate",
        payload: {
          qrToken: "non-existent-qr-token-xyz",
          items: [{ menuItemId: validItemId, quantity: 1, modifierOptionIds: [halfOptionId] }],
        },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe("QR_NOT_FOUND");
    });

    it("should return HTTP 400 when QR token is deactivated (inactive)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders/validate",
        payload: {
          qrToken: inactiveQr,
          items: [{ menuItemId: validItemId, quantity: 1, modifierOptionIds: [halfOptionId] }],
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("QR_INACTIVE");
    });
  });

  // =========================================================================
  // 6. Schema & Payload Validation Guardrails
  // =========================================================================
  describe("6. Schema & Payload Validation Guardrails", () => {
    it("should return HTTP 400 when items array is empty", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders/validate",
        payload: {
          qrToken: validTableQr,
          items: [],
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("VALIDATION_FAILED");
    });

    it("should return HTTP 400 when quantity is zero or negative", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders/validate",
        payload: {
          qrToken: validTableQr,
          items: [{ menuItemId: validItemId, quantity: 0 }],
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("VALIDATION_FAILED");
    });

    it("should return HTTP 400 when menuItemId is not a valid UUID", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders/validate",
        payload: {
          qrToken: validTableQr,
          items: [{ menuItemId: "invalid-not-a-uuid", quantity: 1 }],
        },
      });

      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe("VALIDATION_FAILED");
    });
  });

  // =========================================================================
  // 7. Security & Non-Destructive Invariant
  // =========================================================================
  describe("7. Security & Non-Destructive Invariant", () => {
    it("should not create any orders, order items, or bills during validation", async () => {
      const ordersBefore = await prisma.order.count();
      const orderItemsBefore = await prisma.orderItem.count();
      const billsBefore = await prisma.bill.count();

      const res = await app.inject({
        method: "POST",
        url: "/api/v1/orders/validate",
        payload: {
          qrToken: validTableQr,
          items: [
            {
              menuItemId: validItemId,
              quantity: 2,
              modifierOptionIds: [fullOptionId],
            },
          ],
        },
      });

      expect(res.statusCode).toBe(200);

      const ordersAfter = await prisma.order.count();
      const orderItemsAfter = await prisma.orderItem.count();
      const billsAfter = await prisma.bill.count();

      expect(ordersAfter).toBe(ordersBefore);
      expect(orderItemsAfter).toBe(orderItemsBefore);
      expect(billsAfter).toBe(billsBefore);
    });

    it("should enforce rate limiting on cart validation", async () => {
      // 1st request -> 200 OK
      const res1 = await app.inject({
        method: "POST",
        url: "/api/v1/orders/test-rate-limit-validate",
      });
      expect(res1.statusCode).toBe(200);

      // 2nd request -> 200 OK
      const res2 = await app.inject({
        method: "POST",
        url: "/api/v1/orders/test-rate-limit-validate",
      });
      expect(res2.statusCode).toBe(200);

      // 3rd request -> 429 Too Many Requests
      const res3 = await app.inject({
        method: "POST",
        url: "/api/v1/orders/test-rate-limit-validate",
      });
      expect(res3.statusCode).toBe(429);
      expect(res3.json().error.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });
});
