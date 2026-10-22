import type { FastifyReply, FastifyRequest } from "fastify";
import type { RoomStatus } from "@prisma/client";
import { validate } from "../lib/validate.js";
import { sendSuccess } from "../lib/response.js";
import { getActor } from "../lib/context.js";
import { roomService } from "../services/room.service.js";
import { createRoomSchema, updateRoomSchema } from "../validations/room.validation.js";
import type { RoomListQuery } from "../types/room.types.js";

export const roomController = {
  async listRooms(request: FastifyRequest, reply: FastifyReply) {
    const qrToken = request.headers["x-qr-token"] as string | undefined;
    const rooms = await roomService.listRooms(
      request.authenticatedUser?.tenantId,
      qrToken,
      request.query as RoomListQuery | undefined
    );
    return sendSuccess(request, reply, rooms);
  },

  async createRoom(request: FastifyRequest, reply: FastifyReply) {
    const actor = getActor(request);
    const data = validate(createRoomSchema, request.body);
    const room = await roomService.createRoom(actor, data);
    return sendSuccess(request, reply, room, 201, "Guestroom created successfully");
  },

  async getRoom(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const room = await roomService.getRoom(request.authenticatedUser, id);
    return sendSuccess(request, reply, room);
  },

  async updateRoom(request: FastifyRequest, reply: FastifyReply) {
    const actor = getActor(request);
    const { id } = request.params as { id: string };
    const existing = await roomService.getRoomForUpdate(actor, id);

    const data = validate(updateRoomSchema, request.body);
    const room = await roomService.updateRoom(actor, existing, data);
    return sendSuccess(request, reply, room, 200, "Room updated successfully");
  },

  async updateRoomStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: RoomStatus };
    const room = await roomService.updateRoomStatus(id, status);
    return sendSuccess(request, reply, room, 200, "Room status updated");
  },

  async rotateQrToken(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    const result = await roomService.rotateQrToken(getActor(request), id);
    return sendSuccess(request, reply, result, 200, "Room QR code token rotated successfully");
  },

  async deactivateRoom(request: FastifyRequest, reply: FastifyReply) {
    const { id } = request.params as { id: string };
    await roomService.deactivateRoom(getActor(request), id);
    return sendSuccess(request, reply, null, 200, "Guestroom deactivated successfully");
  },
};
