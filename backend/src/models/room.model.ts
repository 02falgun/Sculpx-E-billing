import { RoomStatus, type Prisma } from "@prisma/client";
import { prisma, type DbClient } from "../database/prisma.js";
import type { RoomListFilter } from "../types/room.types.js";

const activeQrCodesInclude = {
  qrCodes: {
    where: { isActive: true },
    orderBy: { createdAt: "desc" as const },
  },
};

export const roomModel = {
  findById(id: string, db: DbClient = prisma) {
    return db.room.findUnique({ where: { id } });
  },

  findByIdWithActiveQr(id: string, db: DbClient = prisma) {
    return db.room.findUnique({ where: { id }, include: activeQrCodesInclude });
  },

  findByNumber(tenantId: string, roomNumber: string, db: DbClient = prisma) {
    return db.room.findUnique({ where: { tenantId_roomNumber: { tenantId, roomNumber } } });
  },

  findManyForTenant(tenantId: string, filter: RoomListFilter, db: DbClient = prisma) {
    return db.room.findMany({
      where: {
        tenantId,
        ...(filter.includeInactive ? {} : { isActive: true }),
        ...(filter.floor ? { floor: filter.floor } : {}),
      },
      include: activeQrCodesInclude,
      orderBy: { roomNumber: "asc" },
    });
  },

  create(data: Prisma.RoomUncheckedCreateInput, db: DbClient = prisma) {
    return db.room.create({ data });
  },

  updateWithActiveQr(id: string, data: Prisma.RoomUncheckedUpdateInput, db: DbClient = prisma) {
    return db.room.update({ where: { id }, data, include: activeQrCodesInclude });
  },

  deactivate(id: string, db: DbClient = prisma) {
    return db.room.update({
      where: { id },
      data: { isActive: false, status: RoomStatus.VACANT },
    });
  },

  markOccupied(roomId: string, db: DbClient = prisma) {
    return db.room.update({ where: { id: roomId }, data: { status: RoomStatus.OCCUPIED } });
  },
};
