import { IRoomService } from "../interfaces";
import { ApiResponse, Room } from "@/types";
import { MOCK_ROOMS } from "@/mocks/mockDb";

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockRoomService implements IRoomService {
  private rooms: Room[] = [...MOCK_ROOMS];

  async getRooms(params?: { includeInactive?: boolean; floor?: string }): Promise<ApiResponse<Room[]>> {
    await delay(100);
    let list = this.rooms;
    if (!params?.includeInactive) {
      list = list.filter((r) => (r as any).isActive !== false);
    }
    if (params?.floor) {
      list = list.filter((r) => r.floor === params.floor);
    }
    return { success: true, data: list };
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

  async createRoom(data: { roomNumber: string; floor: string; roomType?: string; capacity?: number }): Promise<ApiResponse<Room>> {
    await delay(150);
    const newRoom: Room = {
      id: `rm-mock-${Date.now()}`,
      roomNumber: data.roomNumber,
      floor: data.floor,
      status: "VACANT",
      qrToken: `mock-room-qr-${data.roomNumber}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    (newRoom as any).isActive = true;
    (newRoom as any).roomType = data.roomType || "STANDARD";
    (newRoom as any).capacity = data.capacity || 2;
    this.rooms.push(newRoom);
    return { success: true, data: newRoom, message: "Room created" };
  }

  async updateRoom(
    id: string,
    data: Partial<{ roomNumber: string; floor: string; roomType: string; capacity: number; status: Room["status"]; guestName?: string; folioId?: string; isActive: boolean }>
  ): Promise<ApiResponse<Room>> {
    await delay(150);
    const room = this.rooms.find((r) => r.id === id);
    if (!room) {
      return { success: false, data: null as unknown as Room, error: { code: "NOT_FOUND", message: "Room not found" } };
    }
    Object.assign(room, data);
    room.updatedAt = new Date().toISOString();
    return { success: true, data: room, message: "Room updated" };
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

  async rotateRoomQr(id: string): Promise<ApiResponse<{ roomId: string; qrToken: string }>> {
    await delay(150);
    const room = this.rooms.find((r) => r.id === id);
    if (!room) {
      return { success: false, data: null as any, error: { code: "NOT_FOUND", message: "Room not found" } };
    }
    room.qrToken = `mock-room-rotated-${Date.now()}`;
    return { success: true, data: { roomId: id, qrToken: room.qrToken } };
  }

  async deactivateRoom(id: string): Promise<ApiResponse<null>> {
    await delay(150);
    const room = this.rooms.find((r) => r.id === id);
    if (room) {
      (room as any).isActive = false;
    }
    return { success: true, data: null };
  }
}
