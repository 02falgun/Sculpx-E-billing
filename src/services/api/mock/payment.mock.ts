import { IPaymentService } from "../interfaces";
import { ApiResponse, Payment, RecordPaymentPayload } from "@/types";
import { MOCK_BILLS } from "@/mocks/mockDb";

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockPaymentService implements IPaymentService {
  private payments: Payment[] = [];

  async recordPayment(payload: RecordPaymentPayload): Promise<ApiResponse<Payment>> {
    await delay(200);
    const bill = MOCK_BILLS.find((b) => b.id === payload.billId);
    if (!bill) {
      return {
        success: false,
        data: null as unknown as Payment,
        error: { code: "BILL_NOT_FOUND", message: "Bill not found" },
      };
    }

    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      billId: bill.id,
      orderId: bill.orderId,
      amount: payload.amount,
      method: payload.method,
      status: "SUCCESS",
      transactionReference: payload.transactionReference || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
      roomChargeDetails: payload.roomChargeDetails,
      cardLastFour: payload.cardLastFour,
      upiId: payload.upiId,
      notes: payload.notes,
      refunds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.payments.push(newPayment);
    bill.payments.push(newPayment);
    bill.paidAmount += payload.amount;
    bill.dueAmount = Math.max(0, bill.grandTotal - bill.paidAmount);

    if (bill.dueAmount === 0) {
      bill.status = "PAID";
      bill.settledAt = new Date().toISOString();
    } else {
      bill.status = "PARTIALLY_PAID";
    }

    return { success: true, data: newPayment, message: "Payment recorded successfully" };
  }

  async processRefund(
    paymentId: string,
    amount: number,
    reason: string,
  ): Promise<ApiResponse<Payment>> {
    await delay(200);
    const payment = this.payments.find((p) => p.id === paymentId);
    if (!payment) {
      return {
        success: false,
        data: null as unknown as Payment,
        error: { code: "PAYMENT_NOT_FOUND", message: "Payment not found" },
      };
    }

    const refund = {
      id: `ref-${Date.now()}`,
      paymentId: payment.id,
      amount,
      reason,
      processedBy: "Manager",
      status: "PROCESSED" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (!payment.refunds) payment.refunds = [];
    payment.refunds.push(refund);
    payment.status = "REFUNDED";

    return { success: true, data: payment, message: "Refund processed" };
  }
}
