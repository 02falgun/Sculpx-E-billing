import crypto from "node:crypto";
import { RoomStatus, type Room } from "@prisma/client";
import { withTransaction } from "../database/prisma.js";
import { BadRequestError, ConflictError, ForbiddenError, UnauthorizedError } from "../lib/errors.js";
import { ErrorCode } from "../constants/error-codes.js";
import { ensureFound, assertTenantAccess } from "../lib/guards.js";
import type { ActorContext, AuthenticatedUser } from "../types/auth.types.js";
import type { RoomListQuery, RoomWithQrCodes } from "../types/room.types.js";
import { roomModel } from "../models/room.model.js";
import { qrModel } from "../models/qr.model.js";
import { auditService } from "./audit.service.js";
import type { CreateRoomInput, UpdateRoomInput } from "../validations/room.validation.js";

function formatRoom(room: RoomWithQrCodes) {
  return {
    id: room.id,
    tenantId: room.tenantId,
    roomNumber: room.roomNumber,
    floor: room.floor,
    roomType: room.roomType,
    capacity: room.capacity,
    guestName: room.guestName || undefined,
    folioId: room.folioId || undefined,
    status: room.status,
    isActive: room.isActive,
    qrToken: room.qrCodes[0]?.token || "",
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  };
}

function formatRoomWithDefaultType(room: RoomWithQrCodes) {
  return { ...formatRoom(room), roomType: room.roomType || "STANDARD" };
}

async function getOwnedRoom(actor: ActorContext, id: string) {
  const room = ensureFound(await roomModel.findById(id), "Room not found");
  assertTenantAccess(actor, room.tenantId);
  return room;
}

export const roomService = {
  async listRooms(
    authenticatedTenantId: string | undefined,
    qrToken: string | undefined,
    query: RoomListQuery | undefined
  ) {
    let tenantId = authenticatedTenantId;

    if (!tenantId && qrToken) {
      // Unauthenticated customer: resolve the tenant from the QR header
      const qr = await qrModel.findByToken(qrToken);
      if (qr) tenantId = qr.tenantId;
    }

    if (!tenantId) {
      throw new UnauthorizedError("Authentication or valid QR token context required");
    }

    const rooms = await roomModel.findManyForTenant(tenantId, {
      includeInactive: query?.includeInactive === "true",
      floor: query?.floor,
    });

    return rooms.map(formatRoomWithDefaultType);
  },

  async createRoom(actor: ActorContext, data: CreateRoomInput) {
    const { user } = actor;

    if (await roomModel.findByNumber(user.tenantId, data.roomNumber)) {
      throw new ConflictError(`Room number '${data.roomNumber}' already exists in your property`, ErrorCode.ROOM_EXISTS);
    }

    const qrToken = `rm-${user.tenantId.slice(0, 6)}-${data.roomNumber.toLowerCase()}-${crypto.randomBytes(4).toString("hex")}`;

    const { room, qr } = await withTransaction(async (tx) => {
      const r = await roomModel.create(
        {
          tenantId: user.tenantId,
          roomNumber: data.roomNumber,
          floor: data.floor,
          roomType: data.roomType,
          capacity: data.capacity,
          status: RoomStatus.VACANT,
          isActive: true,
        },
        tx
      );
      const q = await qrModel.createForRoom(user.tenantId, r.id, qrToken, tx);
      return { room: r, qr: q };
    });

    await auditService.recordAction(actor, {
      action: "ROOM_CREATED",
      resource: "rooms",
      resourceId: room.id,
      details: { roomNumber: room.roomNumber, floor: room.floor, roomType: room.roomType },
    });

    return {
      id: room.id,
      tenantId: room.tenantId,
      roomNumber: room.roomNumber,
      floor: room.floor,
      roomType: room.roomType,
      capacity: room.capacity,
      status: room.status,
      isActive: room.isActive,
      qrToken: qr.token,
      createdAt: room.createdAt.toISOString(),
      updatedAt: room.updatedAt.toISOString(),
    };
  },

  async getRoom(user: AuthenticatedUser | undefined, id: string) {
    const room = ensureFound(await roomModel.findByIdWithActiveQr(id), "Room not found");

    if (user && user.role !== "SUPER_ADMIN" && user.tenantId !== room.tenantId) {
      throw new ForbiddenError("Forbidden: cross-tenant access denied");
    }

    return formatRoomWithDefaultType(room);
  },

  /**
   * Lookup + permission check for updates; runs before body validation
   * so 404/403 take precedence over 400.
   */
  async getRoomForUpdate(actor: ActorContext, id: string) {
    return getOwnedRoom(actor, id);
  },

  async updateRoom(actor: ActorContext, existing: Room, data: UpdateRoomInput) {
    const id = existing.id;

    if (
      data.roomNumber &&
      data.roomNumber !== existing.roomNumber &&
      (await roomModel.findByNumber(existing.tenantId, data.roomNumber))
    ) {
      throw new ConflictError(`Room number '${data.roomNumber}' is already in use`, ErrorCode.ROOM_EXISTS);
    }

    const updated = await roomModel.updateWithActiveQr(id, {
      ...(data.roomNumber ? { roomNumber: data.roomNumber } : {}),
      ...(data.floor ? { floor: data.floor } : {}),
      ...(data.roomType ? { roomType: data.roomType } : {}),
      ...(data.capacity !== undefined ? { capacity: data.capacity } : {}),
      ...(data.status ? { status: data.status } : {}),
      ...(data.guestName !== undefined ? { guestName: data.guestName } : {}),
      ...(data.folioId !== undefined ? { folioId: data.folioId } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    });

    await auditService.recordAction(actor, {
      tenantId: existing.tenantId,
      action: "ROOM_UPDATED",
      resource: "rooms",
      resourceId: id,
      details: data,
    });

    return formatRoom(updated);
  },

  async updateRoomStatus(id: string, status: RoomStatus) {
    const updated = await roomModel.updateWithActiveQr(id, { status });
    return formatRoom(updated);
  },

  async rotateQrToken(actor: ActorContext, id: string) {
    const room = await getOwnedRoom(actor, id);

    const newToken = `rm-${room.tenantId.slice(0, 6)}-${room.roomNumber.toLowerCase()}-${crypto.randomBytes(6).toString("hex")}`;

    const newQr = await withTransaction(async (tx) => {
      await qrModel.deactivateForRoom(id, tx);
      return qrModel.createForRoom(room.tenantId, id, newToken, tx);
    });

    await auditService.recordAction(actor, {
      tenantId: room.tenantId,
      action: "QR_TOKEN_ROTATED",
      resource: "rooms",
      resourceId: id,
      details: { roomNumber: room.roomNumber, newQrId: newQr.id },
    });

    return { roomId: id, qrToken: newQr.token };
  },

  async deactivateRoom(actor: ActorContext, id: string): Promise<void> {
    const room = await getOwnedRoom(actor, id);

    if (room.status === RoomStatus.OCCUPIED || room.guestName) {
      throw new BadRequestError("Cannot deactivate room while it is currently occupied by an active guest", ErrorCode.ROOM_OCCUPIED);
    }

    await withTransaction(async (tx) => {
      await roomModel.deactivate(id, tx);
      await qrModel.deactivateForRoom(id, tx);
    });

    await auditService.recordAction(actor, {
      tenantId: room.tenantId,
      action: "ROOM_DEACTIVATED",
      resource: "rooms",
      resourceId: id,
      details: { roomNumber: room.roomNumber },
    });
  },
};
