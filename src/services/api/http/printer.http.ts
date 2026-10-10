import { IPrinterService } from "../interfaces";
import { ApiResponse, PaginatedResult, PaginationParams, PrintJob, Printer } from "@/types";
import { apiClient } from "../client";

export class HttpPrinterService implements IPrinterService {
  async getPrinters(): Promise<ApiResponse<Printer[]>> {
    return apiClient.get<Printer[]>("/printers");
  }

  async getPrintJobs(params?: {
    status?: string;
    pagination?: PaginationParams;
  }): Promise<ApiResponse<PaginatedResult<PrintJob>>> {
    return apiClient.get<PaginatedResult<PrintJob>>("/print-jobs", {
      params: {
        status: params?.status,
        page: params?.pagination?.page,
        limit: params?.pagination?.limit,
      },
    });
  }

  async retryPrintJob(id: string): Promise<ApiResponse<PrintJob>> {
    return apiClient.post<PrintJob>(`/print-jobs/${encodeURIComponent(id)}/retry`);
  }

  async reprintJob(id: string): Promise<ApiResponse<PrintJob>> {
    return apiClient.post<PrintJob>(`/print-jobs/${encodeURIComponent(id)}/reprint`);
  }

  async createPrintJob(payload: {
    printerId: string;
    type: "KOT" | "BILL_RECEIPT" | "DAY_END_REPORT";
    referenceId: string;
  }): Promise<ApiResponse<PrintJob>> {
    return apiClient.post<PrintJob>("/print-jobs", payload);
  }
}
