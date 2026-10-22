import { prisma, type DbClient } from "../database/prisma.js";

export const qrModel = {
  findByToken(token: string, db: DbClient = prisma) {
    return db.qrCode.findUnique({ where: { token } });
  },

  findByTokenWithAssignment(token: string, db: DbClient = prisma) {
    return db.qrCode.findUnique({
      where: { token },
      include: {
        table: true,
        room: true,
      },
    });
  },

  touchLastScanned(id: string, db: DbClient = prisma) {
    return db.qrCode.update({
      where: { id },
      data: { lastScannedAt: new Date() },
    });
  },

  createForTable(tenantId: string, tableId: string, token: string, db: DbClient = prisma) {
    return db.qrCode.create({
      data: { tenantId, type: "TABLE", tableId, token, isActive: true },
    });
  },

  createForRoom(tenantId: string, roomId: string, token: string, db: DbClient = prisma) {
    return db.qrCode.create({
      data: { tenantId, type: "ROOM", roomId, token, isActive: true },
    });
  },

  deactivateForTable(tableId: string, db: DbClient = prisma) {
    return db.qrCode.updateMany({ where: { tableId }, data: { isActive: false } });
  },

  deactivateForRoom(roomId: string, db: DbClient = prisma) {
    return db.qrCode.updateMany({ where: { roomId }, data: { isActive: false } });
  },
};
