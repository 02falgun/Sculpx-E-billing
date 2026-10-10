import { IRoomService } from "../interfaces";
import { ApiResponse, Room } from "@/types";
import { apiClient } from "../client";

export class HttpRoomService implements IRoomService {
  async getRooms(): Promise<ApiResponse<Room[]>> {
    return apiClient.get<Room[]>("/rooms");
  }

  async getRoomById(id: string): Promise<ApiResponse<Room>> {
    return apiClient.get<Room>(`/rooms/${encodeURIComponent(id)}`);
  }

  async updateRoomStatus(id: string, status: Room["status"]): Promise<ApiResponse<Room>> {
    return apiClient.patch<Room>(`/rooms/${encodeURIComponent(id)}/status`, { status });
  }
}
