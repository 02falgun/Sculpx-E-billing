import { IPaymentService } from "../interfaces";
import { ApiResponse, Payment, RecordPaymentPayload } from "@/types";
import { apiClient } from "../client";

export class HttpPaymentService implements IPaymentService {
  async recordPayment(payload: RecordPaymentPayload): Promise<ApiResponse<Payment>> {
    return apiClient.post<Payment>(`/bills/${encodeURIComponent(payload.billId)}/payments`, payload);
  }

  async processRefund(
    paymentId: string,
    amount: number,
    reason: string,
  ): Promise<ApiResponse<Payment>> {
    return apiClient.post<Payment>(`/payments/${encodeURIComponent(paymentId)}/refund`, {
      amount,
      reason,
    });
  }
}
