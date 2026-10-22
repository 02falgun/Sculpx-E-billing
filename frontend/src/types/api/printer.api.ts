/**
 * SCULPX E-Billing — Hardware Printer & Print Job API Contracts
 */

import { ID } from "../common";
import { Printer, PrinterType, PrinterStatus, PrintJob, PrintJobType, PrintJobStatus } from "../printer";
import { ApiPaginationQueryParams } from "./common.api";

export interface RegisterPrinterRequestBody {
  name: string;
  type: PrinterType;
  ipAddress?: string;
  location: string;
  paperWidthMm: number; // 58 or 80
  isDefault?: boolean;
}

export interface UpdatePrinterRequestBody extends Partial<RegisterPrinterRequestBody> {
  status?: PrinterStatus;
}

export interface PrintJobListQueryParams extends ApiPaginationQueryParams {
  printerId?: ID;
  status?: PrintJobStatus;
  type?: PrintJobType;
  startDate?: string;
  endDate?: string;
}

export interface CreatePrintJobRequestBody {
  printerId: ID;
  type: PrintJobType;
  referenceId: string;
}

export interface PrintJobStatusUpdateWebhookBody {
  jobId: ID;
  status: PrintJobStatus;
  errorMessage?: string;
}
