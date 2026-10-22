import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { kitchenApi } from "@/services/api";
import { KOTStatus, UpdateKOTStatusPayload } from "@/types";

export function useActiveKOTs() {
  return useQuery({
    queryKey: ["kitchen", "kots"],
    queryFn: async () => {
      const res = await kitchenApi.getActiveKOTs();
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to load active KOTs");
      }
      return res.data;
    },
    refetchInterval: 10000,
  });
}

export function useUpdateKOTStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      note,
    }: {
      id: string;
      status: KOTStatus;
      note?: string;
    }) => {
      const payload: UpdateKOTStatusPayload = { status, note };
      const res = await kitchenApi.updateKOTStatus(id, payload);
      if (!res.success) {
        throw new Error(res.error?.message || "Failed to update KOT status");
      }
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen", "kots"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
