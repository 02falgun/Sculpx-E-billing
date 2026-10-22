import { describe, it, expect } from "vitest";
import {
  ApiSuccessResponse,
  ApiErrorResponse,
  CreateOrderRequestBody,
  RecordPaymentRequestBody,
  RegisterPrinterRequestBody,
  RecordStockAdjustmentRequestBody,
} from "@/types";

describe("API Contract Type Assertions", () => {
  it("validates that API success responses conform to standard envelope", () => {
    const successPayload: ApiSuccessResponse<{ id: string }> = {
      success: true,
      data: { id: "test-123" },
      message: "Resource loaded",
      meta: { requestId: "req-001" },
    };
    expect(successPayload.success).toBe(true);
    expect(successPayload.data.id).toBe("test-123");
  });

  it("validates that API error responses conform to error schema", () => {
    const errorPayload: ApiErrorResponse = {
      success: false,
      data: null,
      error: {
        code: "VALIDATION_FAILED",
        message: "Invalid field provided",
        details: [{ field: "items[0].quantity", issue: "Must be >= 1" }],
      },
    };
    expect(errorPayload.success).toBe(false);
    expect(errorPayload.data).toBeNull();
    expect(errorPayload.error.code).toBe("VALIDATION_FAILED");
  });

  it("verifies typed mutating request bodies", () => {
    const orderRequest: CreateOrderRequestBody = {
      qrToken: "tbl-01",
      paymentPreference: "PAY_LATER",
      items: [{ menuItemId: "item-1", quantity: 2, modifierIds: [] }],
    };
    expect(orderRequest.paymentPreference).toBe("PAY_LATER");

    const paymentBody: RecordPaymentRequestBody = {
      billId: "bill-01",
      amount: 1200,
      method: "UPI",
      transactionReference: "UPI-TXN-999",
    };
    expect(paymentBody.method).toBe("UPI");

    const adjustmentBody: RecordStockAdjustmentRequestBody = {
      itemId: "inv-01",
      quantityChange: -5,
      type: "WASTAGE",
      reason: "Expired dairy",
    };
    expect(adjustmentBody.quantityChange).toBe(-5);

    const printerBody: RegisterPrinterRequestBody = {
      name: "Kitchen Station 1",
      type: "KITCHEN_KOT",
      location: "Main Kitchen",
      paperWidthMm: 80,
    };
    expect(printerBody.paperWidthMm).toBe(80);
  });
});
