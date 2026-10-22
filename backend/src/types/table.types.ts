import type { QrCode, Table } from "@prisma/client";

/** Raw `GET /tables` query string; passed through unvalidated. */
export interface ListTablesQuery {
  includeInactive?: string;
  section?: string;
}

export interface TableListFilter {
  includeInactive: boolean;
  section?: string;
}

export type TableWithQrCodes = Table & { qrCodes: QrCode[] };
