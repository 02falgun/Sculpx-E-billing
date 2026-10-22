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

export function useCreateTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { tableNumber: string; displayName: string; capacity: number; section: string }) => {
      const res = await tableApi.createTable!(data);
      if (!res.success) throw new Error(res.error?.message || "Failed to create table");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });
}

export function useUpdateTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ tableNumber: string; displayName: string; capacity: number; section: string; status: Table["status"]; isActive: boolean }> }) => {
      const res = await tableApi.updateTable!(id, data);
      if (!res.success) throw new Error(res.error?.message || "Failed to update table");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });
}

export function useRotateTableQr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await tableApi.rotateTableQr!(id);
      if (!res.success) throw new Error(res.error?.message || "Failed to rotate QR");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables"] });
    },
  });
}

export function useDeactivateTable() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await tableApi.deactivateTable!(id);
      if (!res.success) throw new Error(res.error?.message || "Failed to deactivate table");
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

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { roomNumber: string; floor: string; roomType?: string; capacity?: number }) => {
      const res = await roomApi.createRoom!(data);
      if (!res.success) throw new Error(res.error?.message || "Failed to create room");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ roomNumber: string; floor: string; roomType: string; capacity: number; status: Room["status"]; isActive: boolean }> }) => {
      const res = await roomApi.updateRoom!(id, data);
      if (!res.success) throw new Error(res.error?.message || "Failed to update room");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useRotateRoomQr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await roomApi.rotateRoomQr!(id);
      if (!res.success) throw new Error(res.error?.message || "Failed to rotate QR");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useDeactivateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await roomApi.deactivateRoom!(id);
      if (!res.success) throw new Error(res.error?.message || "Failed to deactivate room");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

