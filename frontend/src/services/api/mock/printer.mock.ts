import { IPrinterService } from "../interfaces";
import {
  ApiResponse,
  PaginatedResult,
  PaginationParams,
  Printer,
  PrintJob,
  CreatePrinterDto,
  UpdatePrinterDto,
} from "@/types";
import { MOCK_PRINTERS, MOCK_PRINT_JOBS } from "@/mocks/mockDb";

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockPrinterService implements IPrinterService {
  private printers: Printer[] = [...MOCK_PRINTERS];
  private printJobs: PrintJob[] = [...MOCK_PRINT_JOBS];

  async getPrinters(): Promise<ApiResponse<Printer[]>> {
    await delay(100);
    return { success: true, data: this.printers };
  }

  async getPrinterById(id: string): Promise<ApiResponse<Printer>> {
    await delay(100);
    const printer = this.printers.find((p) => p.id === id);
    if (!printer) {
      return {
        success: false,
        data: null as unknown as Printer,
        error: { code: "PRINTER_NOT_FOUND", message: "Printer not found" },
      };
    }
    return { success: true, data: printer };
  }

  async createPrinter(data: CreatePrinterDto): Promise<ApiResponse<Printer>> {
    await delay(150);
    const newPrinter: Printer = {
      id: `prn-${Date.now()}`,
      name: data.name,
      type: data.type,
      ipAddress: data.ipAddress,
      port: data.port || 9100,
      station: data.station || data.type,
      location: data.location || "Main Station",
      paperWidthMm: data.paperWidthMm || 80,
      status: "ONLINE",
      isOnline: true,
      isDefault: Boolean(data.isDefault),
      isActive: data.isActive !== undefined ? data.isActive : true,
      connectionType: data.connectionType || "NETWORK_TCP",
      lastPingAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.printers.push(newPrinter);
    return { success: true, data: newPrinter, message: "Printer added successfully" };
  }

  async updatePrinter(id: string, data: UpdatePrinterDto): Promise<ApiResponse<Printer>> {
    await delay(150);
    const index = this.printers.findIndex((p) => p.id === id);
    if (index === -1) {
      return {
        success: false,
        data: null as unknown as Printer,
        error: { code: "PRINTER_NOT_FOUND", message: "Printer not found" },
      };
    }
    this.printers[index] = {
      ...this.printers[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };
    return { success: true, data: this.printers[index], message: "Printer updated successfully" };
  }

  async deletePrinter(id: string): Promise<ApiResponse<{ deleted: boolean; deactivated: boolean }>> {
    await delay(150);
    const index = this.printers.findIndex((p) => p.id === id);
    if (index === -1) {
      return {
        success: false,
        data: { deleted: false, deactivated: false },
        error: { code: "PRINTER_NOT_FOUND", message: "Printer not found" },
      };
    }
    this.printers.splice(index, 1);
    return { success: true, data: { deleted: true, deactivated: false } };
  }

  async pingPrinter(id: string): Promise<ApiResponse<{ isOnline: boolean; latencyMs?: number; printer: Printer }>> {
    await delay(200);
    const printer = this.printers.find((p) => p.id === id);
    if (!printer) {
      return {
        success: false,
        data: null as unknown as any,
        error: { code: "PRINTER_NOT_FOUND", message: "Printer not found" },
      };
    }
    printer.lastPingAt = new Date().toISOString();
    printer.status = "ONLINE";
    printer.isOnline = true;
    return {
      success: true,
      data: { isOnline: true, latencyMs: 5, printer },
      message: `Ping to ${printer.name} succeeded (5ms)`,
    };
  }

  async testPrint(printerId: string): Promise<ApiResponse<PrintJob>> {
    await delay(200);
    const printer = this.printers.find((p) => p.id === printerId) || this.printers[0];
    const testJob: PrintJob = {
      id: `pj-diag-${Date.now()}`,
      printerId: printer.id,
      printerName: printer.name,
      type: "TEST_PAGE",
      referenceId: `diag-${Date.now()}`,
      status: "COMPLETED",
      retryCount: 0,
      maxRetries: 3,
      initiatedBy: "Admin Diagnostic",
      completedAt: new Date().toISOString(),
      payloadSummary: `Diagnostic Self-Test on ${printer.name}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.printJobs.unshift(testJob);
    return { success: true, data: testJob, message: "Diagnostic slip printed successfully" };
  }

  async getPrintJobs(params?: {
    status?: string;
    printerId?: string;
    pagination?: PaginationParams;
  }): Promise<ApiResponse<PaginatedResult<PrintJob>>> {
    await delay(150);
    let filtered = [...this.printJobs];
    if (params?.status && params.status !== "all" && params.status !== "ALL") {
      filtered = filtered.filter((j) => j.status === params.status);
    }
    if (params?.printerId) {
      filtered = filtered.filter((j) => j.printerId === params.printerId);
    }
    const page = params?.pagination?.page || 1;
    const limit = params?.pagination?.limit || 10;
    const total = filtered.length;
    const data = filtered.slice((page - 1) * limit, page * limit);

    return {
      success: true,
      data: {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async getPrintJobById(id: string): Promise<ApiResponse<PrintJob>> {
    await delay(100);
    const job = this.printJobs.find((j) => j.id === id);
    if (!job) {
      return {
        success: false,
        data: null as unknown as PrintJob,
        error: { code: "PRINT_JOB_NOT_FOUND", message: "Print job not found" },
      };
    }
    return { success: true, data: job };
  }

  async retryPrintJob(id: string): Promise<ApiResponse<PrintJob>> {
    await delay(200);
    const job = this.printJobs.find((j) => j.id === id);
    if (!job) {
      return {
        success: false,
        data: null as unknown as PrintJob,
        error: { code: "PRINT_JOB_NOT_FOUND", message: "Print job not found" },
      };
    }
    job.retryCount += 1;
    job.status = "COMPLETED";
    job.completedAt = new Date().toISOString();
    job.updatedAt = new Date().toISOString();

    return { success: true, data: job, message: "Print job successfully retried" };
  }

  async reprintJob(id: string, reason?: string): Promise<ApiResponse<PrintJob>> {
    await delay(200);
    const job = this.printJobs.find((j) => j.id === id);
    if (!job) {
      return {
        success: false,
        data: null as unknown as PrintJob,
        error: { code: "PRINT_JOB_NOT_FOUND", message: "Print job not found" },
      };
    }

    const duplicateJob: PrintJob = {
      id: `pj-${Date.now()}`,
      printerId: job.printerId,
      printerName: job.printerName,
      type: job.type,
      referenceId: job.referenceId,
      status: "COMPLETED",
      retryCount: 0,
      maxRetries: 3,
      initiatedBy: "Cashier (Reprint)",
      isReprint: true,
      reprintReason: reason || "Manual reprint requested",
      completedAt: new Date().toISOString(),
      payloadSummary: `[DUPLICATE] ${job.payloadSummary}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.printJobs.unshift(duplicateJob);
    return { success: true, data: duplicateJob, message: "Reprint queued and completed" };
  }

  async cancelPrintJob(id: string, reason?: string): Promise<ApiResponse<PrintJob>> {
    await delay(150);
    const job = this.printJobs.find((j) => j.id === id);
    if (!job) {
      return {
        success: false,
        data: null as unknown as PrintJob,
        error: { code: "PRINT_JOB_NOT_FOUND", message: "Print job not found" },
      };
    }
    job.status = "CANCELLED";
    job.errorMessage = reason || "Cancelled by user";
    job.updatedAt = new Date().toISOString();
    return { success: true, data: job, message: "Print job cancelled" };
  }

  async createPrintJob(payload: {
    printerId?: string;
    type: "KOT" | "BILL_RECEIPT" | "DAY_END_REPORT" | "TEST_PAGE";
    referenceId?: string;
    station?: string;
    payload?: Record<string, unknown>;
  }): Promise<ApiResponse<PrintJob>> {
    await delay(200);
    const printer = this.printers.find((p) => p.id === payload.printerId) || this.printers[0];
    const newJob: PrintJob = {
      id: `pj-${Date.now()}`,
      printerId: printer.id,
      printerName: printer.name,
      type: payload.type,
      referenceId: payload.referenceId || `ref-${Date.now()}`,
      status: "COMPLETED",
      retryCount: 0,
      maxRetries: 3,
      initiatedBy: "STAFF",
      completedAt: new Date().toISOString(),
      payloadSummary: `${payload.type} for ${payload.referenceId || printer.name}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.printJobs.unshift(newJob);
    return { success: true, data: newJob, message: "Print job created" };
  }
}
