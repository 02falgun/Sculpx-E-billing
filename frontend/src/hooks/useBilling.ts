import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { billingApi, paymentApi } from "@/services/api";
import { RecordPaymentPayload } from "@/types";

export function useBill(billId: string) {
  return useQuery({
    queryKey: ["bills", billId],
    queryFn: async () => {
      const res = await billingApi.getBillById(billId);
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to load bill");
      }
      return res.data;
    },
    enabled: !!billId,
  });
}

export function useBillByOrder(orderId: string) {
  return useQuery({
    queryKey: ["bills", "order", orderId],
    queryFn: async () => {
      const res = await billingApi.getBillByOrderId(orderId);
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to load bill for order");
      }
      return res.data;
    },
    enabled: !!orderId,
  });
}

export function useAllBills(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["bills", "list", params?.status || "all", params?.page || 1],
    queryFn: async () => {
      const res = await billingApi.getAllBills({
        status: params?.status === "all" ? undefined : params?.status,
        pagination: { page: params?.page || 1, limit: params?.limit || 20 },
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to load bills");
      return res.data;
    },
    refetchInterval: 10000,
  });
}

export function useRecordPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: RecordPaymentPayload) => {
      const res = await paymentApi.recordPayment(payload);
      if (!res.success) {
        throw new Error(res.error?.message || "Payment processing failed");
      }
      return res.data;
    },
    onSuccess: (payment) => {
      queryClient.invalidateQueries({ queryKey: ["bills", payment.billId] });
      queryClient.invalidateQueries({ queryKey: ["bills", "order", payment.orderId] });
      queryClient.invalidateQueries({ queryKey: ["orders", payment.orderId] });
    },
  });
}
