import { ID, Timestamped } from "./common";

export type PrinterType = "THERMAL_RECEIPT" | "KITCHEN_KOT" | "BAR_KOT" | "INVOICE_A4";

export type PrinterStatus = "ONLINE" | "OFFLINE" | "LOW_PAPER" | "ERROR";

export type PrintJobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";

export type PrintJobType = "KOT" | "BILL_RECEIPT" | "DAY_END_REPORT" | "TEST_PAGE";

export interface Printer extends Timestamped {
  id: ID;
  name: string; // e.g. "Kitchen Station 1", "Cash Counter POS"
  type: PrinterType;
  ipAddress?: string;
  location: string;
  status: PrinterStatus;
  isDefault: boolean;
  paperWidthMm: number; // 58 or 80
  lastPingAt: string;
}

export interface PrintJob extends Timestamped {
  id: ID;
  printerId: ID;
  printerName: string;
  type: PrintJobType;
  referenceId: string; // orderId, billId, or reportId
  status: PrintJobStatus;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  initiatedBy: string; // username or "SYSTEM"
  completedAt?: string;
  payloadSummary: string;
}
