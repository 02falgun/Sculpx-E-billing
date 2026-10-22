import { IBillingService } from "../interfaces";
import { ApiResponse, Bill, PaginatedResult, PaginationParams } from "@/types";
import { apiClient } from "../client";

export class HttpBillingService implements IBillingService {
  async getBillById(id: string): Promise<ApiResponse<Bill>> {
    return apiClient.get<Bill>(`/bills/${encodeURIComponent(id)}`);
  }

  async getBillByOrderId(orderId: string): Promise<ApiResponse<Bill>> {
    return apiClient.get<Bill>(`/bills/order/${encodeURIComponent(orderId)}`);
  }

  async getAllBills(params?: {
    status?: string;
    pagination?: PaginationParams;
  }): Promise<ApiResponse<PaginatedResult<Bill>>> {
    return apiClient.get<PaginatedResult<Bill>>("/bills", {
      params: {
        status: params?.status,
        page: params?.pagination?.page,
        limit: params?.pagination?.limit,
      },
    });
  }

  async generateBillForOrder(orderId: string): Promise<ApiResponse<Bill>> {
    return apiClient.post<Bill>(`/bills/order/${encodeURIComponent(orderId)}/generate`);
  }

  async applyDiscount(
    billId: string,
    discount: { type: "PERCENTAGE" | "FLAT"; value: number; code?: string },
  ): Promise<ApiResponse<Bill>> {
    return apiClient.post<Bill>(`/bills/${encodeURIComponent(billId)}/discount`, discount);
  }

  async voidBill(billId: string, reason: string): Promise<ApiResponse<Bill>> {
    return apiClient.post<Bill>(`/bills/${encodeURIComponent(billId)}/void`, { reason });
  }
}
