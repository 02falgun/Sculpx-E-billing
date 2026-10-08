import { IRoomService } from "../interfaces";
import { ApiResponse, Room } from "@/types";
import { MOCK_ROOMS } from "@/mocks/mockDb";

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockRoomService implements IRoomService {
  private rooms: Room[] = [...MOCK_ROOMS];

  async getRooms(): Promise<ApiResponse<Room[]>> {
    await delay(100);
    return { success: true, data: this.rooms };
  }

  async getRoomById(id: string): Promise<ApiResponse<Room>> {
    await delay(100);
    const room = this.rooms.find((r) => r.id === id);
    if (!room) {
      return {
        success: false,
        data: null as unknown as Room,
        error: { code: "ROOM_NOT_FOUND", message: "Room not found" },
      };
    }
    return { success: true, data: room };
  }

  async updateRoomStatus(id: string, status: Room["status"]): Promise<ApiResponse<Room>> {
    await delay(150);
    const room = this.rooms.find((r) => r.id === id);
    if (!room) {
      return {
        success: false,
        data: null as unknown as Room,
        error: { code: "ROOM_NOT_FOUND", message: "Room not found" },
      };
    }
    room.status = status;
    room.updatedAt = new Date().toISOString();
    return { success: true, data: room, message: "Room status updated" };
  }
}
