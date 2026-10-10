import { IOrderService } from "../interfaces";
import {
  ApiResponse,
  CreateOrderPayload,
  Order,
  OrderStatus,
  OrderValidationResult,
  PaginatedResult,
  PaginationParams,
} from "@/types";
import { apiClient } from "../client";

export class HttpOrderService implements IOrderService {
  async validateOrder(payload: CreateOrderPayload): Promise<ApiResponse<OrderValidationResult>> {
    return apiClient.post<OrderValidationResult>("/orders/validate", payload);
  }

  async createOrder(payload: CreateOrderPayload): Promise<ApiResponse<Order>> {
    return apiClient.post<Order>("/orders", payload);
  }

  async getOrderById(id: string): Promise<ApiResponse<Order>> {
    return apiClient.get<Order>(`/orders/${encodeURIComponent(id)}`);
  }

  async getOrders(params?: {
    status?: OrderStatus;
    qrType?: "ROOM" | "TABLE";
    pagination?: PaginationParams;
  }): Promise<ApiResponse<PaginatedResult<Order>>> {
    return apiClient.get<PaginatedResult<Order>>("/orders", {
      params: {
        status: params?.status,
        qrType: params?.qrType,
        page: params?.pagination?.page,
        limit: params?.pagination?.limit,
      },
    });
  }

  async updateOrderStatus(id: string, status: OrderStatus, note?: string): Promise<ApiResponse<Order>> {
    return apiClient.patch<Order>(`/orders/${encodeURIComponent(id)}/status`, { status, note });
  }

  async cancelOrder(id: string, reason: string): Promise<ApiResponse<Order>> {
    return apiClient.post<Order>(`/orders/${encodeURIComponent(id)}/cancel`, { reason });
  }
}
