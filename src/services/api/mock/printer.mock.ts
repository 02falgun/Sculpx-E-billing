import { IPrinterService } from "../interfaces";
import { ApiResponse, PaginatedResult, PaginationParams, Printer, PrintJob } from "@/types";
import { MOCK_PRINTERS, MOCK_PRINT_JOBS } from "@/mocks/mockDb";

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockPrinterService implements IPrinterService {
  private printers: Printer[] = [...MOCK_PRINTERS];
  private printJobs: PrintJob[] = [...MOCK_PRINT_JOBS];

  async getPrinters(): Promise<ApiResponse<Printer[]>> {
    await delay(100);
    return { success: true, data: this.printers };
  }

  async getPrintJobs(params?: {
    status?: string;
    pagination?: PaginationParams;
  }): Promise<ApiResponse<PaginatedResult<PrintJob>>> {
    await delay(150);
    let filtered = [...this.printJobs];
    if (params?.status) {
      filtered = filtered.filter((j) => j.status === params.status);
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

  async reprintJob(id: string): Promise<ApiResponse<PrintJob>> {
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
      completedAt: new Date().toISOString(),
      payloadSummary: `[DUPLICATE] ${job.payloadSummary}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.printJobs.unshift(duplicateJob);
    return { success: true, data: duplicateJob, message: "Reprint queued and completed" };
  }

  async createPrintJob(payload: {
    printerId: string;
    type: "KOT" | "BILL_RECEIPT" | "DAY_END_REPORT";
    referenceId: string;
  }): Promise<ApiResponse<PrintJob>> {
    await delay(200);
    const printer = this.printers.find((p) => p.id === payload.printerId) || this.printers[0];
    const newJob: PrintJob = {
      id: `pj-${Date.now()}`,
      printerId: printer.id,
      printerName: printer.name,
      type: payload.type,
      referenceId: payload.referenceId,
      status: "COMPLETED",
      retryCount: 0,
      maxRetries: 3,
      initiatedBy: "STAFF",
      completedAt: new Date().toISOString(),
      payloadSummary: `${payload.type} for ${payload.referenceId}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.printJobs.unshift(newJob);
    return { success: true, data: newJob, message: "Print job created" };
  }
}
