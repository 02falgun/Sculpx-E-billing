import { z } from "zod";
import { PrinterType, PrintJobStatus } from "@prisma/client";

export const printerIdParamSchema = z.object({
  id: z.string().uuid("Invalid printer ID format"),
});

export type PrinterIdParam = z.infer<typeof printerIdParamSchema>;

export const printJobIdParamSchema = z.object({
  id: z.string().uuid("Invalid print job ID format"),
});

export type PrintJobIdParam = z.infer<typeof printJobIdParamSchema>;

export const createPrinterBodySchema = z.object({
  name: z.string().min(2, "Printer name must be at least 2 characters").max(100),
  type: z.nativeEnum(PrinterType, {
    errorMap: () => ({ message: "Printer type must be KITCHEN, BAR, or BILLING" }),
  }),
  ipAddress: z.string().min(1, "IP address or hostname is required").max(45),
  port: z.coerce.number().int().min(1).max(65535).default(9100),
  macAddress: z.string().max(50).nullable().optional(),
  station: z.string().max(50).nullable().optional(),
  location: z.string().max(100).nullable().optional(),
  paperWidthMm: z.coerce.number().int().refine((val) => val === 58 || val === 80, {
    message: "Paper width must be either 58mm or 80mm",
  }).default(80),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  connectionType: z.string().max(50).default("NETWORK_TCP"),
  agentId: z.string().uuid("Invalid agent ID format").nullable().optional(),
});

export type CreatePrinterBody = z.infer<typeof createPrinterBodySchema>;

export const updatePrinterBodySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  type: z.nativeEnum(PrinterType).optional(),
  ipAddress: z.string().min(1).max(45).optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  macAddress: z.string().max(50).nullable().optional(),
  station: z.string().max(50).nullable().optional(),
  location: z.string().max(100).nullable().optional(),
  paperWidthMm: z.coerce.number().int().refine((val) => val === 58 || val === 80, {
    message: "Paper width must be either 58mm or 80mm",
  }).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  connectionType: z.string().max(50).optional(),
  agentId: z.string().uuid("Invalid agent ID format").nullable().optional(),
});

export type UpdatePrinterBody = z.infer<typeof updatePrinterBodySchema>;

export const listPrintersQuerySchema = z.object({
  type: z.nativeEnum(PrinterType).optional(),
  station: z.string().optional(),
  isActive: z
    .string()
    .transform((val) => val.toLowerCase() === "true" || val === "1")
    .optional(),
});

export type ListPrintersQuery = z.infer<typeof listPrintersQuerySchema>;

export const createPrintJobBodySchema = z.object({
  printerId: z.string().uuid("Invalid printer ID").optional(),
  type: z.enum(["KOT", "BILL_RECEIPT", "DAY_END_REPORT", "TEST_PAGE"], {
    errorMap: () => ({ message: "Job type must be KOT, BILL_RECEIPT, DAY_END_REPORT, or TEST_PAGE" }),
  }),
  referenceId: z.string().max(100).optional(),
  station: z.string().max(50).optional(),
  payload: z.record(z.unknown()).optional(),
  idempotencyKey: z.string().max(255).optional(),
});

export type CreatePrintJobBody = z.infer<typeof createPrintJobBodySchema>;

export const listPrintJobsQuerySchema = z.object({
  status: z.nativeEnum(PrintJobStatus).optional(),
  printerId: z.string().uuid().optional(),
  jobType: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListPrintJobsQuery = z.infer<typeof listPrintJobsQuerySchema>;

export const reprintJobBodySchema = z.object({
  reason: z.string().min(3, "Reprint reason must be at least 3 characters").optional(),
});

export type ReprintJobBody = z.infer<typeof reprintJobBodySchema>;
