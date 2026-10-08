"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { printerApi } from "@/services/api";

export function usePrinters() {
  return useQuery({
    queryKey: ["printers"],
    queryFn: async () => {
      const res = await printerApi.getPrinters();
      if (!res.success) throw new Error(res.error?.message || "Failed to load printers");
      return res.data;
    },
    refetchInterval: 10000,
  });
}

export function usePrintJobs(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["print-jobs", params?.status || "all", params?.page || 1],
    queryFn: async () => {
      const res = await printerApi.getPrintJobs({
        status: params?.status === "all" ? undefined : params?.status,
        pagination: { page: params?.page || 1, limit: params?.limit || 20 },
      });
      if (!res.success) throw new Error(res.error?.message || "Failed to load print jobs");
      return res.data;
    },
    refetchInterval: 10000,
  });
}

export function useCreatePrintJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      printerId: string;
      type: "KOT" | "BILL_RECEIPT" | "DAY_END_REPORT";
      referenceId: string;
    }) => {
      const res = await printerApi.createPrintJob(payload);
      if (!res.success) throw new Error(res.error?.message || "Failed to create print job");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["print-jobs"] });
    },
  });
}

export function useRetryPrintJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await printerApi.retryPrintJob(id);
      if (!res.success) throw new Error(res.error?.message || "Failed to retry print job");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["print-jobs"] });
    },
  });
}
