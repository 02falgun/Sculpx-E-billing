import { ID, Timestamped } from "./common";

export type PrinterType =
  | "KITCHEN"
  | "BAR"
  | "BILLING"
  | "THERMAL_RECEIPT"
  | "KITCHEN_KOT"
  | "BAR_KOT"
  | "INVOICE_A4";

export type PrinterStatus = "ONLINE" | "OFFLINE" | "LOW_PAPER" | "ERROR" | "UNKNOWN";

export type PrintJobStatus =
  | "QUEUED"
  | "PENDING"
  | "PRINTING"
  | "PROCESSING"
  | "COMPLETED"
  | "PRINTED"
  | "FAILED"
  | "UNCERTAIN"
  | "CANCELLED";

export type PrintJobType = "KOT" | "BILL_RECEIPT" | "DAY_END_REPORT" | "TEST_PAGE";

export interface Printer extends Timestamped {
  id: ID;
  name: string; // e.g. "Kitchen Station 1", "Cash Counter POS"
  type: PrinterType;
  ipAddress?: string;
  port?: number;
  macAddress?: string | null;
  station?: string | null;
  location?: string;
  status: PrinterStatus;
  isOnline?: boolean;
  isDefault: boolean;
  paperWidthMm: number; // 58 or 80
  isActive?: boolean;
  connectionType?: string;
  lastPingAt?: string | null;
}

export interface PrintJob extends Timestamped {
  id: ID;
  printerId: ID;
  printerName?: string;
  type: PrintJobType;
  jobType?: string;
  referenceId?: string | null;
  status: PrintJobStatus;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string | null;
  initiatedBy?: string;
  completedAt?: string | null;
  payloadSummary?: string;
  payload?: Record<string, unknown>;
  isReprint?: boolean;
  reprintReason?: string | null;
  printer?: Partial<Printer>;
}

export interface CreatePrinterDto {
  name: string;
  type: "KITCHEN" | "BAR" | "BILLING";
  ipAddress: string;
  port?: number;
  station?: string;
  location?: string;
  paperWidthMm?: 58 | 80;
  isActive?: boolean;
  isDefault?: boolean;
  connectionType?: string;
}

export interface UpdatePrinterDto {
  name?: string;
  type?: "KITCHEN" | "BAR" | "BILLING";
  ipAddress?: string;
  port?: number;
  station?: string;
  location?: string;
  paperWidthMm?: 58 | 80;
  isActive?: boolean;
  isDefault?: boolean;
  connectionType?: string;
}
