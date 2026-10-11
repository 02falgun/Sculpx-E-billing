import type { Printer } from "@prisma/client";

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

  /**
   * Transmit binary or string print payload to printer hardware.
   * Resolves with outcome, identifying definite success, definite failure, or uncertain delivery.
   */
  print(printer: Printer, data: Buffer | string): Promise<PrinterAdapterResult>;

  /**
   * Probe physical device readiness (e.g. TCP connect or ping).
   */
  checkHealth(printer: Printer): Promise<PrinterHealthResult>;
}
