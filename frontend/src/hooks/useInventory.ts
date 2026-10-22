"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryApi } from "@/services/api";
import { InventoryItem, InventoryTransaction, Recipe, PaginationParams } from "@/types";

export const INVENTORY_QUERY_KEY = ["inventory"] as const;

export function useInventoryItems(params?: {
  isLowStock?: boolean;
  search?: string;
  pagination?: PaginationParams;
}) {
  return useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, "items", params],
    queryFn: async () => {
      const res = await inventoryApi.getItems(params);
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to fetch inventory items");
      }
      return res.data;
    },
    staleTime: 30000,
  });
}

export function useInventoryItem(id: string) {
  return useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, "item", id],
    queryFn: async () => {
      const res = await inventoryApi.getItemById(id);
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to fetch item");
      }
      return res.data;
    },
    enabled: !!id,
  });
}

export function useInventoryTransactions(params?: {
  itemId?: string;
  pagination?: PaginationParams;
}) {
  return useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, "transactions", params],
    queryFn: async () => {
      const res = await inventoryApi.getTransactions(params);
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to fetch inventory transactions");
      }
      return res.data;
    },
    staleTime: 30000,
  });
}

export function useInventoryRecipes() {
  return useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, "recipes"],
    queryFn: async () => {
      const res = await inventoryApi.getRecipes();
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to fetch recipes");
      }
      return res.data;
    },
    staleTime: 60000,
  });
}

export function useAdjustStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      itemId,
      quantityChange,
      reason,
      type,
    }: {
      itemId: string;
      quantityChange: number;
      reason: string;
      type: "RESTOCK" | "USAGE" | "WASTAGE" | "ADJUSTMENT";
    }) => {
      const res = await inventoryApi.recordStockAdjustment(itemId, quantityChange, reason, type);
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to adjust stock");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
    },
  });
}
