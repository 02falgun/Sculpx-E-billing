import type { Printer } from "@prisma/client";
import type { IPrinterAdapter, PrinterAdapterResult, PrinterHealthResult } from "./types.js";
import { printAgentGatewayService } from "../print-agent-gateway.service.js";
import { NetworkEscPosAdapter } from "./network-escpos.adapter.js";

/**
 * Local Print Agent adapter for dispatching jobs to printers on a restaurant's private LAN
 * through an outbound authenticated WebSocket connection.
 */
export class AgentPrinterAdapter implements IPrinterAdapter {
  public readonly adapterName = "LOCAL_AGENT_PRINTER_ADAPTER";

  async print(
    printer: Printer,
    data: Buffer | string,
    context?: { jobId?: string; jobType?: string; isReprint?: boolean }
  ): Promise<PrinterAdapterResult> {
    return printAgentGatewayService.dispatchPrint(printer, data, context);
  }

  async checkHealth(printer: Printer): Promise<PrinterHealthResult> {
    return printAgentGatewayService.dispatchHealthCheck(printer);
  }
}

/**
 * Hybrid adapter that automatically routes between Local Print Agent and direct Network TCP
 * based on printer configuration and agent availability.
 */
export class HybridPrinterAdapter implements IPrinterAdapter {
  public readonly adapterName = "HYBRID_PRINTER_ADAPTER";

  private agentAdapter: AgentPrinterAdapter;
  private networkAdapter: NetworkEscPosAdapter;

  constructor() {
    this.agentAdapter = new AgentPrinterAdapter();
    this.networkAdapter = new NetworkEscPosAdapter();
  }

  async print(
    printer: Printer,
    data: Buffer | string,
    context?: { jobId?: string; jobType?: string; isReprint?: boolean }
  ): Promise<PrinterAdapterResult> {
    // If printer uses LOCAL_AGENT, has an assigned agentId, or has an active connected agent
    if (
      printer.connectionType === "LOCAL_AGENT" ||
      printer.agentId ||
      printAgentGatewayService.isAgentAvailableForPrinter(printer)
    ) {
      return this.agentAdapter.print(printer, data, context);
    }

    return this.networkAdapter.print(printer, data);
  }

  async checkHealth(printer: Printer): Promise<PrinterHealthResult> {
    if (
      printer.connectionType === "LOCAL_AGENT" ||
      printer.agentId ||
      printAgentGatewayService.isAgentAvailableForPrinter(printer)
    ) {
      return this.agentAdapter.checkHealth(printer);
    }

    return this.networkAdapter.checkHealth(printer);
  }
}
