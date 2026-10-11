import { Prisma, PrinterType, PrintJobStatus, type Printer } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import type { IPrinterAdapter, PrinterHealthResult } from "./printer-adapters/types.js";
import { NetworkEscPosAdapter } from "./printer-adapters/network-escpos.adapter.js";
import { HybridPrinterAdapter } from "./printer-adapters/agent.adapter.js";

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

export interface UpdatePrinterInput {
  name?: string;
  type?: PrinterType;
  ipAddress?: string;
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

export interface ListPrintersFilter {
  type?: PrinterType;
  station?: string;
  isActive?: boolean;
}

export class PrinterService {
  private adapter: IPrinterAdapter;

  constructor(adapter?: IPrinterAdapter) {
    this.adapter = adapter || new HybridPrinterAdapter();
  }

  /**
   * Set the hardware adapter (e.g. Mock adapter for unit testing).
   */
  setAdapter(adapter: IPrinterAdapter): void {
    this.adapter = adapter;
  }

  /**
   * Get the current active hardware adapter.
   */
  getAdapter(): IPrinterAdapter {
    return this.adapter;
  }

  /**
   * List printers for a tenant with optional filters.
   * Scoped strictly by tenantId.
   */
  async listPrinters(tenantId: string, filters: ListPrintersFilter = {}): Promise<Printer[]> {
    const where: Prisma.PrinterWhereInput = {
      tenantId,
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.station ? { station: filters.station } : {}),
      ...(filters.isActive !== undefined ? { isActive: filters.isActive } : {}),
    };

    return prisma.printer.findMany({
      where,
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    });
  }

  /**
   * Get a printer by ID, strictly verifying tenant ownership.
   */
  async getPrinterById(tenantId: string, printerId: string): Promise<Printer> {
    const printer = await prisma.printer.findUnique({
      where: { id: printerId },
    });

    if (!printer || printer.tenantId !== tenantId) {
      throw new AppError("Printer not found", 404, "PRINTER_NOT_FOUND");
    }

    return printer;
  }

  /**
   * Create a new printer for a tenant.
   */
  async createPrinter(tenantId: string, input: CreatePrinterInput): Promise<Printer> {
    // If marked as default, unset other defaults for same tenant and type
    if (input.isDefault) {
      await prisma.printer.updateMany({
        where: {
          tenantId,
          type: input.type,
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const created = await prisma.printer.create({
      data: {
        tenantId,
        name: input.name.trim(),
        type: input.type,
        ipAddress: input.ipAddress.trim(),
        port: input.port || 9100,
        macAddress: input.macAddress?.trim() || null,
        station: input.station?.trim() || null,
        location: input.location?.trim() || null,
        paperWidthMm: input.paperWidthMm || 80,
        isActive: input.isActive !== undefined ? input.isActive : true,
        isDefault: Boolean(input.isDefault),
        connectionType: input.connectionType || "NETWORK_TCP",
        agentId: input.agentId || null,
        isOnline: true,
      },
    });

    logger.info({
      event: "printer_created",
      printerId: created.id,
      tenantId,
      name: created.name,
      type: created.type,
      station: created.station,
    });

    return created;
  }

  /**
   * Update printer configuration.
   */
  async updatePrinter(tenantId: string, printerId: string, input: UpdatePrinterInput): Promise<Printer> {
    await this.getPrinterById(tenantId, printerId);

    // If making this printer the default, unset other defaults for the same type
    if (input.isDefault && input.type) {
      await prisma.printer.updateMany({
        where: {
          tenantId,
          type: input.type,
          isDefault: true,
          id: { not: printerId },
        },
        data: { isDefault: false },
      });
    }

    const updated = await prisma.printer.update({
      where: { id: printerId },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.ipAddress !== undefined ? { ipAddress: input.ipAddress.trim() } : {}),
        ...(input.port !== undefined ? { port: input.port } : {}),
        ...(input.macAddress !== undefined ? { macAddress: input.macAddress?.trim() || null } : {}),
        ...(input.station !== undefined ? { station: input.station?.trim() || null } : {}),
        ...(input.location !== undefined ? { location: input.location?.trim() || null } : {}),
        ...(input.paperWidthMm !== undefined ? { paperWidthMm: input.paperWidthMm } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
        ...(input.connectionType !== undefined ? { connectionType: input.connectionType } : {}),
        ...(input.agentId !== undefined ? { agentId: input.agentId } : {}),
      },
    });

    logger.info({
      event: "printer_updated",
      printerId: updated.id,
      tenantId,
    });

    return updated;
  }

  /**
   * Soft-delete (disable) or remove a printer.
   * If the printer has historical print jobs, soft-deactivate to preserve audit trail.
   */
  async deletePrinter(tenantId: string, printerId: string): Promise<{ deleted: boolean; deactivated: boolean }> {
    const printer = await this.getPrinterById(tenantId, printerId);

    const jobsCount = await prisma.printJob.count({
      where: { printerId },
    });

    if (jobsCount > 0) {
      await prisma.printer.update({
        where: { id: printerId },
        data: { isActive: false, isOnline: false },
      });
      return { deleted: false, deactivated: true };
    }

    await prisma.printer.delete({
      where: { id: printerId },
    });

    return { deleted: true, deactivated: false };
  }

  /**
   * Health-check a printer hardware device and persist the outcome.
   */
  async pingPrinter(tenantId: string, printerId: string): Promise<PrinterHealthResult & { printer: Printer }> {
    const printer = await this.getPrinterById(tenantId, printerId);

    const health = await this.adapter.checkHealth(printer);

    const updated = await prisma.printer.update({
      where: { id: printerId },
      data: {
        isOnline: health.isOnline,
        lastPingAt: new Date(),
      },
    });

    return {
      ...health,
      printer: updated,
    };
  }

  /**
   * Route and resolve an appropriate active printer for a document type and station.
   */
  async routePrinter(
    tenantId: string,
    documentType: string,
    station?: string
  ): Promise<Printer | null> {
    // 1. If station is explicitly provided, look for an active printer assigned to that station
    if (station) {
      const stationMatch = await prisma.printer.findFirst({
        where: {
          tenantId,
          isActive: true,
          station: { equals: station, mode: "insensitive" },
        },
      });
      if (stationMatch) return stationMatch;
    }

    // 2. Map document type to default PrinterType
    let targetType: PrinterType;
    switch (documentType) {
      case "KOT":
        targetType = PrinterType.KITCHEN;
        break;
      case "BILL_RECEIPT":
        targetType = PrinterType.BILLING;
        break;
      case "BAR_KOT":
        targetType = PrinterType.BAR;
        break;
      default:
        targetType = PrinterType.KITCHEN;
        break;
    }

    // 3. Look for default printer of that type
    const defaultPrinter = await prisma.printer.findFirst({
      where: {
        tenantId,
        type: targetType,
        isActive: true,
        isDefault: true,
      },
    });
    if (defaultPrinter) return defaultPrinter;

    // 4. Look for any active printer of that type
    const anyOfType = await prisma.printer.findFirst({
      where: {
        tenantId,
        type: targetType,
        isActive: true,
      },
    });
    if (anyOfType) return anyOfType;

    // 5. Fallback: Any active printer in the tenant
    return prisma.printer.findFirst({
      where: {
        tenantId,
        isActive: true,
      },
    });
  }

  /**
   * Get operational metrics for the tenant's printer fleet and queue.
   */
  async getOperationalSummary(tenantId: string) {
    const [totalPrinters, onlinePrinters, offlinePrinters, queueStats] = await Promise.all([
      prisma.printer.count({ where: { tenantId, isActive: true } }),
      prisma.printer.count({ where: { tenantId, isActive: true, isOnline: true } }),
      prisma.printer.count({ where: { tenantId, isActive: true, isOnline: false } }),
      prisma.printJob.groupBy({
        by: ["status"],
        where: { tenantId },
        _count: { id: true },
      }),
    ]);

    const counts: Record<string, number> = {
      QUEUED: 0,
      PRINTING: 0,
      COMPLETED: 0,
      FAILED: 0,
      UNCERTAIN: 0,
      CANCELLED: 0,
    };

    for (const stat of queueStats) {
      counts[stat.status] = stat._count.id;
    }

    return {
      fleet: {
        total: totalPrinters,
        online: onlinePrinters,
        offline: offlinePrinters,
      },
      queue: {
        pending: counts.QUEUED,
        processing: counts.PRINTING,
        completed: counts.COMPLETED,
        failed: counts.FAILED,
        uncertain: counts.UNCERTAIN,
        cancelled: counts.CANCELLED,
      },
    };
  }
}

export const printerService = new PrinterService();
