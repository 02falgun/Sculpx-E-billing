import { IKitchenService } from "../interfaces";
import { ApiResponse, KOT, UpdateKOTStatusPayload } from "@/types";
import { apiClient } from "../client";

export class HttpKitchenService implements IKitchenService {
  async getActiveKOTs(): Promise<ApiResponse<KOT[]>> {
    return apiClient.get<KOT[]>("/kitchen/kots");
  }

  async getKOTById(id: string): Promise<ApiResponse<KOT>> {
    return apiClient.get<KOT>(`/kitchen/kots/${encodeURIComponent(id)}`);
  }

  async updateKOTStatus(id: string, payload: UpdateKOTStatusPayload): Promise<ApiResponse<KOT>> {
    return apiClient.patch<KOT>(`/kitchen/kots/${encodeURIComponent(id)}/status`, payload);
  }
}
