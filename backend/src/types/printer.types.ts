import type { Printer, PrinterType } from "@prisma/client";

// ── Printer registry ────────────────────────────────────────────────────────

export interface CreatePrinterInput {
  name: string;
  type: PrinterType;
  ipAddress: string;
  port?: number;
  macAddress?: string | null;
  station?: string | null;
  location?: string | null;
  paperWidthMm?: number;
  isActive?: boolean;
  isDefault?: boolean;
  connectionType?: string;
  agentId?: string | null;
}

export type UpdatePrinterInput = Partial<CreatePrinterInput>;

export interface PrinterFilter {
  type?: PrinterType;
  station?: string;
  isActive?: boolean;
}

export type ListPrintersFilter = PrinterFilter;

// ── Hardware adapters ───────────────────────────────────────────────────────

export interface PrintContext {
  jobId?: string;
  jobType?: string;
  isReprint?: boolean;
}

export interface PrinterAdapterResult {
  success: boolean;
  uncertain?: boolean;
  error?: string;
  bytesWritten?: number;
}

export interface PrinterHealthResult {
  isOnline: boolean;
  error?: string;
  latencyMs?: number;
  details?: Record<string, unknown>;
}

export interface IPrinterAdapter {
  readonly adapterName: string;

  /** Transmit a payload; the result distinguishes success, definite failure and uncertain delivery. */
  print(printer: Printer, data: Buffer | string, context?: PrintContext): Promise<PrinterAdapterResult>;

  /** Probe device readiness (e.g. TCP connect). */
  checkHealth(printer: Printer): Promise<PrinterHealthResult>;
}

export interface MockPrintRecord {
  printerId: string;
  data: Buffer | string;
  timestamp: Date;
  uncertain?: boolean;
}

export interface NetworkAdapterOptions {
  connectTimeoutMs?: number;
  writeTimeoutMs?: number;
  maxPayloadBytes?: number;
}

// ── Document rendering ──────────────────────────────────────────────────────

export interface RenderOptions {
  /** 80 (default, 48 chars) or 58 (32 chars). */
  paperWidthMm?: number;
  isReprint?: boolean;
  reprintReason?: string;
  reprintCount?: number;
}

export interface EscPosOptions {
  enableBuzzer?: boolean;
  partialCut?: boolean;
}

export interface KotPrintItem {
  name: string;
  quantity: number;
  modifiers?: string[];
  specialInstructions?: string | null;
}

export interface KotPrintPayload {
  kotNumber: string;
  orderNumber?: string;
  station?: string;
  tableOrRoom: string;
  serverName?: string;
  createdAt: string;
  items: KotPrintItem[];
  notes?: string | null;
  isReprint?: boolean;
  reprintReason?: string;
  reprintCount?: number;
}

export interface ReceiptTaxLine {
  label: string;
  ratePercent?: number;
  amount: number;
}

export interface ReceiptPrintItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ReceiptPrintPayload {
  propertyHeader?: {
    name: string;
    address?: string;
    phone?: string;
    gstin?: string;
  };
  invoiceNumber: string;
  orderNumber?: string;
  tableOrRoom: string;
  billedBy?: string;
  issuedAt: string;
  items: ReceiptPrintItem[];
  subtotal: number;
  discountAmount?: number;
  discountReason?: string;
  serviceChargeAmount?: number;
  taxBreakdown: ReceiptTaxLine[];
  roundOff?: number;
  grandTotal: number;
  payments?: Array<{
    method: string;
    amount: number;
    reference?: string;
  }>;
  balanceDue?: number;
  /** UNPAID, PARTIALLY_PAID or PAID. */
  paymentStatus: string;
  isReprint?: boolean;
  reprintReason?: string;
  reprintCount?: number;
}

export interface TestSlipPayload {
  printerName: string;
  printerId: string;
  ipAddress?: string;
  port?: number;
  station?: string;
  paperWidthMm?: number;
  connectionType?: string;
  timestamp: string;
}
