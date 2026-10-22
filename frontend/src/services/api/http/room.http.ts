import { IRoomService } from "../interfaces";
import { ApiResponse, Room } from "@/types";
import { apiClient } from "../client";

export class HttpRoomService implements IRoomService {
  async getRooms(params?: { includeInactive?: boolean; floor?: string }): Promise<ApiResponse<Room[]>> {
    const searchParams = new URLSearchParams();
    if (params?.includeInactive) searchParams.set("includeInactive", "true");
    if (params?.floor) searchParams.set("floor", params.floor);
    const qs = searchParams.toString();
    return apiClient.get<Room[]>(`/rooms${qs ? `?${qs}` : ""}`);
  }

  async getRoomById(id: string): Promise<ApiResponse<Room>> {
    return apiClient.get<Room>(`/rooms/${encodeURIComponent(id)}`);
  }

  async createRoom(data: { roomNumber: string; floor: string; roomType?: string; capacity?: number }): Promise<ApiResponse<Room>> {
    return apiClient.post<Room>("/rooms", data);
  }

  async updateRoom(
    id: string,
    data: Partial<{ roomNumber: string; floor: string; roomType: string; capacity: number; status: Room["status"]; guestName?: string; folioId?: string; isActive: boolean }>
  ): Promise<ApiResponse<Room>> {
    return apiClient.patch<Room>(`/rooms/${encodeURIComponent(id)}`, data);
  }

  async updateRoomStatus(id: string, status: Room["status"]): Promise<ApiResponse<Room>> {
    return apiClient.patch<Room>(`/rooms/${encodeURIComponent(id)}/status`, { status });
  }

  async rotateRoomQr(id: string): Promise<ApiResponse<{ roomId: string; qrToken: string }>> {
    return apiClient.post<{ roomId: string; qrToken: string }>(`/rooms/${encodeURIComponent(id)}/qr/rotate`);
  }

  async deactivateRoom(id: string): Promise<ApiResponse<null>> {
    return apiClient.delete<null>(`/rooms/${encodeURIComponent(id)}`);
  }
}
