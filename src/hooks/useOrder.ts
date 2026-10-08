import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderApi } from "@/services/api";
import { CreateOrderPayload, OrderStatus, PaginationParams } from "@/types";

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ["orders", orderId],
    queryFn: async () => {
      const res = await orderApi.getOrderById(orderId);
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to load order");
      }
      return res.data;
    },
    enabled: !!orderId,
    refetchInterval: 15000, // Background fallback polling
  });
}

export function useOrders(params?: {
  status?: OrderStatus;
  qrType?: "ROOM" | "TABLE";
  pagination?: PaginationParams;
}) {
  return useQuery({
    queryKey: [
      "orders",
      "list",
      params?.status || "all",
      params?.qrType || "all",
      params?.pagination?.page || 1,
    ],
    queryFn: async () => {
      const res = await orderApi.getOrders(params);
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to load orders");
      }
      return res.data;
    },
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateOrderPayload) => {
      const res = await orderApi.createOrder(payload);
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to create order");
      }
      return res.data;
    },
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.setQueryData(["orders", newOrder.id], newOrder);
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const res = await orderApi.cancelOrder(orderId, reason);
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to cancel order");
      }
      return res.data;
    },
    onSuccess: (updatedOrder) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.setQueryData(["orders", updatedOrder.id], updatedOrder);
    },
  });
}
