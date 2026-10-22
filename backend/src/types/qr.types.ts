import type { QrCode, Room, Table } from "@prisma/client";

export type QrTypeDto = "TABLE" | "ROOM";

/** A QR token that passed every validity, assignment and tenant-isolation check. */
export interface ValidatedQrEntity {
  qr: QrCode;
  tenantId: string;
  type: QrTypeDto;
  table?: Table | null;
  room?: Room | null;
}

export interface PublicQrLocationDetails {
  floor?: string;
  section?: string;
  capacity?: number;
}

/** Public dining context for a QR token; never exposes tenant, guest or folio data. */
export interface PublicQrContextResponse {
  id: string;
  token: string;
  type: QrTypeDto;
  identifier: string;
  displayName: string;
  roomOrTableId: string;
  tableId?: string;
  roomId?: string;
  locationDetails: PublicQrLocationDetails;
  subtext: string;
  isActive: boolean;
  status: string;
}
