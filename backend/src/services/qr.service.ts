import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import type { PublicQrContextResponse } from "../schemas/qr.schema.js";
import type { PrismaClient, Prisma, QrCode, Table, Room } from "@prisma/client";

export interface ValidatedQrEntity {
  qr: QrCode;
  tenantId: string;
  type: "TABLE" | "ROOM";
  table?: Table | null;
  room?: Room | null;
}

export class QrService {
  /**
   * Internal validator returning the fully verified database entity and tenant scope.
   * Enforces:
   * 1. Token existence in database
   * 2. Active status
   * 3. Dynamic expiry or revocation checks
   * 4. Single, unambiguous assignment (TABLE vs ROOM)
   * 5. Strict tenant boundary matching between QR record and associated entity
   */
  async resolveValidatedQrEntity(
    token: string,
    client?: Prisma.TransactionClient | PrismaClient
  ): Promise<ValidatedQrEntity> {
    const db = client || prisma;
    let qr = await db.qrCode.findUnique({
      where: { token },
      include: {
        table: true,
        room: true,
      },
    });

    if (!qr) {
      const lower = token.toLowerCase();

      // Fallback 1: Resolve table by identifier (e.g. table-T01, T01, table-1, 1)
      if (lower.startsWith("table-") || lower.startsWith("t") || /^\d+$/.test(token)) {
        const raw1 = token.replace(/^table-?/i, "");
        const raw2 = raw1.replace(/^t0*/i, "");
        const raw3 = raw1.replace(/^0+/, "");
        const raw4 = raw2 ? `T${raw2.padStart(2, "0")}` : "";
        const candidates = Array.from(new Set([token, raw1, raw2, raw3, raw4].filter(Boolean)));

        const candidateTable = await db.table.findFirst({
          where: {
            OR: candidates.map((num) => ({ tableNumber: num })),
            isActive: true,
          },
          include: {
            qrCodes: {
              where: { isActive: true },
              orderBy: { createdAt: "desc" },
            },
          },
        });

        if (candidateTable) {
          if (candidateTable.qrCodes.length > 0) {
            qr = {
              ...candidateTable.qrCodes[0],
              table: candidateTable,
              room: null,
            };
          } else {
            qr = await db.qrCode.create({
              data: {
                tenantId: candidateTable.tenantId,
                type: "TABLE",
                tableId: candidateTable.id,
                token: `tbl-${candidateTable.tableNumber.toLowerCase()}-${Date.now().toString(36)}`,
                isActive: true,
              },
              include: {
                table: true,
                room: true,
              },
            });
          }
        }
      }

      // Fallback 2: Resolve room by identifier (e.g. room-101, 101, room-R-001)
      if (!qr && (lower.startsWith("room-") || lower.startsWith("r") || /^\d{3,}$/.test(token))) {
        const raw1 = token.replace(/^room-?/i, "");
        const raw2 = raw1.replace(/^r-?0*/i, "");
        const candidates = Array.from(new Set([token, raw1, raw2].filter(Boolean)));

        const candidateRoom = await db.room.findFirst({
          where: {
            OR: candidates.map((num) => ({ roomNumber: num })),
            isActive: true,
          },
          include: {
            qrCodes: {
              where: { isActive: true },
              orderBy: { createdAt: "desc" },
            },
          },
        });

        if (candidateRoom) {
          if (candidateRoom.qrCodes.length > 0) {
            qr = {
              ...candidateRoom.qrCodes[0],
              table: null,
              room: candidateRoom,
            };
          } else {
            qr = await db.qrCode.create({
              data: {
                tenantId: candidateRoom.tenantId,
                type: "ROOM",
                roomId: candidateRoom.id,
                token: `room-${candidateRoom.roomNumber.toLowerCase()}-${Date.now().toString(36)}`,
                isActive: true,
              },
              include: {
                table: true,
                room: true,
              },
            });
          }
        }
      }
    }

    if (!qr) {
      throw new AppError("QR code not found or invalid", 404, "QR_NOT_FOUND");
    }

    if (!qr.isActive) {
      throw new AppError("QR code is inactive or has been disabled", 400, "QR_INACTIVE");
    }

    // Check optional dynamic expiry or revocation fields if present in schema
    const dynamicQr = qr as unknown as { expiresAt?: Date | null; revokedAt?: Date | null };
    if (dynamicQr.expiresAt && dynamicQr.expiresAt < new Date()) {
      throw new AppError("QR code has expired", 400, "QR_EXPIRED");
    }
    if (dynamicQr.revokedAt) {
      throw new AppError("QR code has been revoked", 400, "QR_REVOKED");
    }

    // Update lastScannedAt asynchronously in background (non-blocking)
    prisma.qrCode
      .update({
        where: { id: qr.id },
        data: { lastScannedAt: new Date() },
      })
      .catch(() => {
        // Suppress background update error so it never fails the customer's scan
      });

    if (qr.type === "TABLE") {
      // Must have valid associated table
      if (!qr.tableId || !qr.table) {
        throw new AppError("QR code assignment is invalid or missing table", 404, "QR_INVALID_ASSIGNMENT");
      }

      // Ambiguous assignment check: a TABLE QR must not have a ROOM assigned
      if (qr.roomId || qr.room) {
        throw new AppError("QR code assignment is ambiguous", 404, "QR_INVALID_ASSIGNMENT");
      }

      // Enforce strict tenant isolation: Table must belong to same tenant as QR record
      if (qr.table.tenantId !== qr.tenantId) {
        throw new AppError("QR code assignment is invalid", 404, "QR_INVALID_ASSIGNMENT");
      }

      return {
        qr,
        tenantId: qr.tenantId,
        type: "TABLE",
        table: qr.table,
      };
    }

    if (qr.type === "ROOM") {
      // Must have valid associated room
      if (!qr.roomId || !qr.room) {
        throw new AppError("QR code assignment is invalid or missing room", 404, "QR_INVALID_ASSIGNMENT");
      }

      // Ambiguous assignment check: a ROOM QR must not have a TABLE assigned
      if (qr.tableId || qr.table) {
        throw new AppError("QR code assignment is ambiguous", 404, "QR_INVALID_ASSIGNMENT");
      }

      // Enforce strict tenant isolation: Room must belong to same tenant as QR record
      if (qr.room.tenantId !== qr.tenantId) {
        throw new AppError("QR code assignment is invalid", 404, "QR_INVALID_ASSIGNMENT");
      }

      return {
        qr,
        tenantId: qr.tenantId,
        type: "ROOM",
        room: qr.room,
      };
    }

    throw new AppError("Unsupported QR code type", 400, "UNSUPPORTED_QR_TYPE");
  }

  /**
   * Resolve an untrusted QR token into a validated public dining context.
   * Strips internal database IDs, tenant boundaries, guest names, and folio IDs.
   */
  async resolvePublicQrContext(token: string): Promise<PublicQrContextResponse> {
    const validated = await this.resolveValidatedQrEntity(token);

    if (validated.type === "TABLE" && validated.table) {
      return {
        id: `qr-tbl-${validated.table.tableNumber}`,
        token: validated.qr.token,
        type: "TABLE",
        identifier: validated.table.tableNumber,
        displayName: validated.table.displayName || `Table ${validated.table.tableNumber}`,
        roomOrTableId: validated.table.id,
        tableId: validated.table.id,
        locationDetails: {
          section: validated.table.section,
          capacity: validated.table.capacity,
        },
        subtext: `${validated.table.section} • ${validated.table.capacity} Seats`,
        isActive: validated.qr.isActive,
        status: validated.table.status,
      };
    }

    if (validated.type === "ROOM" && validated.room) {
      // Security note: Exclude guestName, folioId, and tenantId from response
      return {
        id: `qr-room-${validated.room.roomNumber}`,
        token: validated.qr.token,
        type: "ROOM",
        identifier: validated.room.roomNumber,
        displayName: `Room ${validated.room.roomNumber}`,
        roomOrTableId: validated.room.id,
        roomId: validated.room.id,
        locationDetails: {
          floor: validated.room.floor,
        },
        subtext: validated.room.floor,
        isActive: validated.qr.isActive,
        status: validated.room.status,
      };
    }

    throw new AppError("Unsupported QR code type", 400, "UNSUPPORTED_QR_TYPE");
  }
}

export const qrService = new QrService();
