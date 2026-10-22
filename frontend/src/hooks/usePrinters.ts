"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { printerApi } from "@/services/api";
import type { CreatePrinterDto, UpdatePrinterDto } from "@/types";

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

export function usePrinter(id: string) {
  return useQuery({
    queryKey: ["printer", id],
    queryFn: async () => {
      if (!printerApi.getPrinterById) throw new Error("Method not supported");
      const res = await printerApi.getPrinterById(id);
      if (!res.success) throw new Error(res.error?.message || "Failed to load printer");
      return res.data;
    },
    enabled: Boolean(id),
  });
}

export function useCreatePrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePrinterDto) => {
      if (!printerApi.createPrinter) throw new Error("Method not supported");
      const res = await printerApi.createPrinter(data);
      if (!res.success) throw new Error(res.error?.message || "Failed to create printer");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["printers"] });
    },
  });
}

export function useUpdatePrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePrinterDto }) => {
      if (!printerApi.updatePrinter) throw new Error("Method not supported");
      const res = await printerApi.updatePrinter(id, data);
      if (!res.success) throw new Error(res.error?.message || "Failed to update printer");
      return res.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["printers"] });
      queryClient.invalidateQueries({ queryKey: ["printer", vars.id] });
    },
  });
}

export function useDeletePrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!printerApi.deletePrinter) throw new Error("Method not supported");
      const res = await printerApi.deletePrinter(id);
      if (!res.success) throw new Error(res.error?.message || "Failed to delete printer");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["printers"] });
    },
  });
}

export function usePingPrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!printerApi.pingPrinter) throw new Error("Method not supported");
      const res = await printerApi.pingPrinter(id);
      if (!res.success) throw new Error(res.error?.message || "Failed to ping printer");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["printers"] });
    },
  });
}

export function useTestPrint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (printerId: string) => {
      if (!printerApi.testPrint) throw new Error("Method not supported");
      const res = await printerApi.testPrint(printerId);
      if (!res.success) throw new Error(res.error?.message || "Diagnostic test print failed");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["print-jobs"] });
    },
  });
}

export function usePrintJobs(params?: { status?: string; printerId?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ["print-jobs", params?.status || "all", params?.printerId || "all", params?.page || 1],
    queryFn: async () => {
      const res = await printerApi.getPrintJobs({
        status: params?.status === "all" ? undefined : params?.status,
        printerId: params?.printerId === "all" ? undefined : params?.printerId,
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
      printerId?: string;
      type: "KOT" | "BILL_RECEIPT" | "DAY_END_REPORT" | "TEST_PAGE";
      referenceId?: string;
      station?: string;
      payload?: Record<string, unknown>;
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

export function useReprintJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const res = await printerApi.reprintJob(id, reason);
      if (!res.success) throw new Error(res.error?.message || "Failed to issue reprint copy");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["print-jobs"] });
    },
  });
}

export function useCancelPrintJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      if (!printerApi.cancelPrintJob) throw new Error("Method not supported");
      const res = await printerApi.cancelPrintJob(id, reason);
      if (!res.success) throw new Error(res.error?.message || "Failed to cancel print job");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["print-jobs"] });
    },
  });
}
