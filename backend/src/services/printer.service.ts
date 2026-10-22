import { PrinterType, type Printer } from "@prisma/client";
import { NotFoundError } from "../lib/errors.js";
import { ErrorCode } from "../constants/error-codes.js";
import { logger } from "../lib/logger.js";
import { printerModel } from "../models/printer.model.js";
import { printJobModel } from "../models/print-job.model.js";
import type {
  CreatePrinterInput,
  IPrinterAdapter,
  ListPrintersFilter,
  PrinterHealthResult,
  UpdatePrinterInput,
} from "../types/printer.types.js";
import { HybridPrinterAdapter } from "../integrations/printer/adapters/agent.adapter.js";

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
    return printerModel.findManyForTenant(tenantId, filters);
  }

  /**
   * Get a printer by ID, strictly verifying tenant ownership.
   */
  async getPrinterById(tenantId: string, printerId: string): Promise<Printer> {
    const printer = await printerModel.findById(printerId);

    if (!printer || printer.tenantId !== tenantId) {
      throw new NotFoundError("Printer not found", ErrorCode.PRINTER_NOT_FOUND);
    }

    return printer;
  }

  /**
   * Create a new printer for a tenant.
   */
  async createPrinter(tenantId: string, input: CreatePrinterInput): Promise<Printer> {
    // If marked as default, unset other defaults for same tenant and type
    if (input.isDefault) {
      await printerModel.clearDefaults(tenantId, input.type);
    }

    const created = await printerModel.create({
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
      await printerModel.clearDefaults(tenantId, input.type, printerId);
    }

    const updated = await printerModel.update(printerId, {
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
    await this.getPrinterById(tenantId, printerId);

    const jobsCount = await printJobModel.countByPrinter(printerId);

    if (jobsCount > 0) {
      await printerModel.update(printerId, { isActive: false, isOnline: false });
      return { deleted: false, deactivated: true };
    }

    await printerModel.delete(printerId);

    return { deleted: true, deactivated: false };
  }

  /**
   * Health-check a printer hardware device and persist the outcome.
   */
  async pingPrinter(tenantId: string, printerId: string): Promise<PrinterHealthResult & { printer: Printer }> {
    const printer = await this.getPrinterById(tenantId, printerId);

    const health = await this.adapter.checkHealth(printer);

    const updated = await printerModel.update(printerId, {
      isOnline: health.isOnline,
      lastPingAt: new Date(),
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
      const stationMatch = await printerModel.findActiveByStation(tenantId, station);
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
    const defaultPrinter = await printerModel.findActiveDefaultOfType(tenantId, targetType);
    if (defaultPrinter) return defaultPrinter;

    // 4. Look for any active printer of that type
    const anyOfType = await printerModel.findActiveOfType(tenantId, targetType);
    if (anyOfType) return anyOfType;

    // 5. Fallback: Any active printer in the tenant
    return printerModel.findAnyActive(tenantId);
  }

  /**
   * Get operational metrics for the tenant's printer fleet and queue.
   */
  async getOperationalSummary(tenantId: string) {
    const [totalPrinters, onlinePrinters, offlinePrinters, queueStats] = await Promise.all([
      printerModel.countActive(tenantId),
      printerModel.countActive(tenantId, true),
      printerModel.countActive(tenantId, false),
      printJobModel.countByStatus(tenantId),
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
