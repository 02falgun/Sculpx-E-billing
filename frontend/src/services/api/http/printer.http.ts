import { IPrinterService } from "../interfaces";
import {
  ApiResponse,
  PaginatedResult,
  PaginationParams,
  PrintJob,
  Printer,
  CreatePrinterDto,
  UpdatePrinterDto,
} from "@/types";
import { apiClient } from "../client";

export class HttpPrinterService implements IPrinterService {
  async getPrinters(): Promise<ApiResponse<Printer[]>> {
    return apiClient.get<Printer[]>("/printers");
  }

  async getPrinterById(id: string): Promise<ApiResponse<Printer>> {
    return apiClient.get<Printer>(`/printers/${encodeURIComponent(id)}`);
  }

  async createPrinter(data: CreatePrinterDto): Promise<ApiResponse<Printer>> {
    return apiClient.post<Printer>("/printers", data);
  }

  async updatePrinter(id: string, data: UpdatePrinterDto): Promise<ApiResponse<Printer>> {
    return apiClient.patch<Printer>(`/printers/${encodeURIComponent(id)}`, data);
  }

  async deletePrinter(id: string): Promise<ApiResponse<{ deleted: boolean; deactivated: boolean }>> {
    return apiClient.delete<{ deleted: boolean; deactivated: boolean }>(`/printers/${encodeURIComponent(id)}`);
  }

  async pingPrinter(id: string): Promise<ApiResponse<{ isOnline: boolean; latencyMs?: number; printer: Printer }>> {
    return apiClient.post<{ isOnline: boolean; latencyMs?: number; printer: Printer }>(
      `/printers/${encodeURIComponent(id)}/ping`
    );
  }

  async testPrint(printerId: string): Promise<ApiResponse<PrintJob>> {
    return apiClient.post<PrintJob>(`/printers/${encodeURIComponent(printerId)}/test`);
  }

  async getPrintJobs(params?: {
    status?: string;
    printerId?: string;
    pagination?: PaginationParams;
  }): Promise<ApiResponse<PaginatedResult<PrintJob>>> {
    return apiClient.get<PaginatedResult<PrintJob>>("/print-jobs", {
      params: {
        status: params?.status,
        printerId: params?.printerId,
        page: params?.pagination?.page,
        limit: params?.pagination?.limit,
      },
    });
  }

  async getPrintJobById(id: string): Promise<ApiResponse<PrintJob>> {
    return apiClient.get<PrintJob>(`/print-jobs/${encodeURIComponent(id)}`);
  }

  async retryPrintJob(id: string): Promise<ApiResponse<PrintJob>> {
    return apiClient.post<PrintJob>(`/print-jobs/${encodeURIComponent(id)}/retry`);
  }

  async reprintJob(id: string, reason?: string): Promise<ApiResponse<PrintJob>> {
    return apiClient.post<PrintJob>(`/print-jobs/${encodeURIComponent(id)}/reprint`, { reason });
  }

  async cancelPrintJob(id: string, reason?: string): Promise<ApiResponse<PrintJob>> {
    return apiClient.post<PrintJob>(`/print-jobs/${encodeURIComponent(id)}/cancel`, { reason });
  }

  async createPrintJob(payload: {
    printerId?: string;
    type: "KOT" | "BILL_RECEIPT" | "DAY_END_REPORT" | "TEST_PAGE";
    referenceId?: string;
    station?: string;
    payload?: Record<string, unknown>;
  }): Promise<ApiResponse<PrintJob>> {
    return apiClient.post<PrintJob>("/print-jobs", payload);
  }
}
