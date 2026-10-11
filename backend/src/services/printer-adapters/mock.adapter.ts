import type { Printer } from "@prisma/client";
import type { IPrinterAdapter, PrinterAdapterResult, PrinterHealthResult } from "./types.js";

export interface MockPrintRecord {
  printerId: string;
  data: Buffer | string;
  timestamp: Date;
  uncertain?: boolean;
}

export class MockPrinterAdapter implements IPrinterAdapter {
  public readonly adapterName = "MOCK_PRINTER_ADAPTER";

  private simulatedFailures = new Map<string, string>();
  private simulatedUncertain = new Set<string>();
  private simulatedOffline = new Set<string>();
  private printHistory: MockPrintRecord[] = [];

  setSimulatedFailure(printerId: string, error: string): void {
    this.simulatedFailures.set(printerId, error);
  }

  clearSimulatedFailure(printerId: string): void {
    this.simulatedFailures.delete(printerId);
  }

  setSimulatedUncertain(printerId: string, uncertain = true): void {
    if (uncertain) {
      this.simulatedUncertain.add(printerId);
    } else {
      this.simulatedUncertain.delete(printerId);
    }
  }

  setSimulatedOffline(printerId: string, offline = true): void {
    if (offline) {
      this.simulatedOffline.add(printerId);
    } else {
      this.simulatedOffline.delete(printerId);
    }
  }

  getPrintHistory(printerId?: string): MockPrintRecord[] {
    if (!printerId) return [...this.printHistory];
    return this.printHistory.filter((h) => h.printerId === printerId);
  }

  clearHistory(): void {
    this.printHistory = [];
    this.simulatedFailures.clear();
    this.simulatedUncertain.clear();
    this.simulatedOffline.clear();
  }

  async print(printer: Printer, data: Buffer | string): Promise<PrinterAdapterResult> {
    // 1. Check if printer is simulated offline
    if (this.simulatedOffline.has(printer.id)) {
      return {
        success: false,
        uncertain: false,
        error: `Printer ${printer.name} is offline or unreachable on ${printer.ipAddress}:${printer.port}`,
      };
    }

    // 2. Check if printer has simulated uncertain outcome (e.g. transmitted without ACK)
    if (this.simulatedUncertain.has(printer.id)) {
      this.printHistory.push({
        printerId: printer.id,
        data,
        timestamp: new Date(),
        uncertain: true,
      });
      return {
        success: false,
        uncertain: true,
        error: `UNCERTAIN_DELIVERY: Buffer transmitted to ${printer.ipAddress}:${printer.port} but hardware ACK dropped before connection close`,
      };
    }

    // 3. Check if simulated failure
    const failureMsg = this.simulatedFailures.get(printer.id);
    if (failureMsg) {
      return {
        success: false,
        uncertain: false,
        error: failureMsg,
      };
    }

    // 4. Default success
    const bytes = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data, "utf8");
    this.printHistory.push({
      printerId: printer.id,
      data,
      timestamp: new Date(),
      uncertain: false,
    });

    return {
      success: true,
      uncertain: false,
      bytesWritten: bytes,
    };
  }

  async checkHealth(printer: Printer): Promise<PrinterHealthResult> {
    if (this.simulatedOffline.has(printer.id)) {
      return {
        isOnline: false,
        error: "Connection refused / host unreachable",
        latencyMs: 15,
      };
    }

    return {
      isOnline: true,
      latencyMs: 4,
      details: {
        station: printer.station,
        paperWidthMm: printer.paperWidthMm,
        type: printer.type,
      },
    };
  }
}
