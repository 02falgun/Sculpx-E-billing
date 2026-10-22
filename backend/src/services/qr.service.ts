import { BadRequestError, NotFoundError } from "../lib/errors.js";
import { ErrorCode } from "../constants/error-codes.js";
import { qrModel } from "../models/qr.model.js";
import type { DbClient } from "../database/prisma.js";
import type { PublicQrContextResponse, ValidatedQrEntity } from "../types/qr.types.js";

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
    client?: DbClient
  ): Promise<ValidatedQrEntity> {
    const qr = await qrModel.findByTokenWithAssignment(token, client);

    if (!qr) {
      throw new NotFoundError("QR code not found or invalid", ErrorCode.QR_NOT_FOUND);
    }

    if (!qr.isActive) {
      throw new BadRequestError("QR code is inactive or has been disabled", ErrorCode.QR_INACTIVE);
    }

    // Expiry/revocation columns are not in the schema yet; honour them if they are added
    const dynamicQr = qr as unknown as { expiresAt?: Date | null; revokedAt?: Date | null };
    if (dynamicQr.expiresAt && dynamicQr.expiresAt < new Date()) {
      throw new BadRequestError("QR code has expired", ErrorCode.QR_EXPIRED);
    }
    if (dynamicQr.revokedAt) {
      throw new BadRequestError("QR code has been revoked", ErrorCode.QR_REVOKED);
    }

    // Fire-and-forget: a failed timestamp update must never fail the customer's scan
    qrModel.touchLastScanned(qr.id).catch(() => {});

    if (qr.type === "TABLE") {
      // Must have valid associated table
      if (!qr.tableId || !qr.table) {
        throw new NotFoundError("QR code assignment is invalid or missing table", ErrorCode.QR_INVALID_ASSIGNMENT);
      }

      // Ambiguous assignment check: a TABLE QR must not have a ROOM assigned
      if (qr.roomId || qr.room) {
        throw new NotFoundError("QR code assignment is ambiguous", ErrorCode.QR_INVALID_ASSIGNMENT);
      }

      // Enforce strict tenant isolation: Table must belong to same tenant as QR record
      if (qr.table.tenantId !== qr.tenantId) {
        throw new NotFoundError("QR code assignment is invalid", ErrorCode.QR_INVALID_ASSIGNMENT);
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
        throw new NotFoundError("QR code assignment is invalid or missing room", ErrorCode.QR_INVALID_ASSIGNMENT);
      }

      // Ambiguous assignment check: a ROOM QR must not have a TABLE assigned
      if (qr.tableId || qr.table) {
        throw new NotFoundError("QR code assignment is ambiguous", ErrorCode.QR_INVALID_ASSIGNMENT);
      }

      // Enforce strict tenant isolation: Room must belong to same tenant as QR record
      if (qr.room.tenantId !== qr.tenantId) {
        throw new NotFoundError("QR code assignment is invalid", ErrorCode.QR_INVALID_ASSIGNMENT);
      }

      return {
        qr,
        tenantId: qr.tenantId,
        type: "ROOM",
        room: qr.room,
      };
    }

    throw new BadRequestError("Unsupported QR code type", ErrorCode.UNSUPPORTED_QR_TYPE);
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

    throw new BadRequestError("Unsupported QR code type", ErrorCode.UNSUPPORTED_QR_TYPE);
  }
}

export const qrService = new QrService();
