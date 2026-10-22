import type { QrCode, Room } from "@prisma/client";

/** Raw `GET /rooms` query string; passed through unvalidated. */
export interface RoomListQuery {
  includeInactive?: string;
  floor?: string;
}

export interface RoomListFilter {
  includeInactive: boolean;
  floor?: string;
}

export type RoomWithQrCodes = Room & { qrCodes: QrCode[] };
