import { IKitchenService } from "../interfaces";
import { ApiResponse, KOT, UpdateKOTStatusPayload } from "@/types";
import { MOCK_KOTS } from "@/mocks/mockDb";

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockKitchenService implements IKitchenService {
  private kots: KOT[] = [...MOCK_KOTS];

  async getActiveKOTs(): Promise<ApiResponse<KOT[]>> {
    await delay(150);
    // Return KOTs that are not SERVED or CANCELLED
    const active = this.kots.filter((k) => k.status !== "SERVED" && k.status !== "CANCELLED");
    return { success: true, data: active };
  }

  async getKOTById(id: string): Promise<ApiResponse<KOT>> {
    await delay(100);
    const kot = this.kots.find((k) => k.id === id);
    if (!kot) {
      return {
        success: false,
        data: null as unknown as KOT,
        error: { code: "KOT_NOT_FOUND", message: "KOT not found" },
      };
    }
    return { success: true, data: kot };
  }

  async updateKOTStatus(id: string, payload: UpdateKOTStatusPayload): Promise<ApiResponse<KOT>> {
    await delay(150);
    const kot = this.kots.find((k) => k.id === id);
    if (!kot) {
      return {
        success: false,
        data: null as unknown as KOT,
        error: { code: "KOT_NOT_FOUND", message: "KOT not found" },
      };
    }

    kot.status = payload.status;
    kot.updatedAt = new Date().toISOString();

    if (payload.status === "ACCEPTED") {
      kot.acceptedAt = new Date().toISOString();
    } else if (payload.status === "READY") {
      kot.preparedAt = new Date().toISOString();
    } else if (payload.status === "SERVED") {
      kot.servedAt = new Date().toISOString();
    }

    return { success: true, data: kot, message: `KOT status updated to ${payload.status}` };
  }
}
