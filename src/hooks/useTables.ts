"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { tableApi, roomApi } from "@/services/api";
import { Table, Room } from "@/types";

export function useTables() {
  return useQuery({
    queryKey: ["tables"],
    queryFn: async () => {
      const res = await tableApi.getTables();
      if (!res.success) throw new Error(res.error?.message || "Failed to load tables");
      return res.data;
    },
    refetchInterval: 10000,
  });
}

export function useUpdateTableStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Table["status"] }) => {
      const res = await tableApi.updateTableStatus(id, status);
      if (!res.success) throw new Error(res.error?.message || "Failed to update table status");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });
}

export function useRooms() {
  return useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const res = await roomApi.getRooms();
      if (!res.success) throw new Error(res.error?.message || "Failed to load rooms");
      return res.data;
    },
    refetchInterval: 10000,
  });
}

export function useUpdateRoomStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Room["status"] }) => {
      const res = await roomApi.updateRoomStatus(id, status);
      if (!res.success) throw new Error(res.error?.message || "Failed to update room status");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}
