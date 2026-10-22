import type { Prisma, PrintJob, Printer, PrintJobStatus } from "@prisma/client";

export interface CreatePrintJobInput {
  printerId?: string;
  type: "KOT" | "BILL_RECEIPT" | "DAY_END_REPORT" | "TEST_PAGE" | string;
  referenceId?: string | null;
  station?: string | null;
  payload: Record<string, unknown>;
  idempotencyKey?: string | null;
  initiatedBy?: string | null;
  maxRetries?: number;
}

export interface PrintJobFilter {
  status?: PrintJobStatus;
  printerId?: string;
  jobType?: string;
}

export interface ListPrintJobsFilter extends PrintJobFilter {
  page?: number;
  limit?: number;
}

/** A print job loaded with its full printer record. */
export type PrintJobWithPrinter = Prisma.PrintJobGetPayload<{ include: { printer: true } }>;

/** Any job shape the status broadcaster accepts; the printer is only used for its name. */
export type BroadcastablePrintJob = PrintJob & { printer?: Pick<Printer, "name"> };
