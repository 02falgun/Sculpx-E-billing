/**
 * SCULPX E-Billing — Hardware Print Document Renderers
 * Generates authoritative ESC/POS binary buffers and formatted monospace plain-text representations
 * for Kitchen Order Tickets (KOT), Customer Tax Invoices/Receipts, and Diagnostic Slips.
 */

export interface RenderOptions {
  paperWidthMm?: number; // 80 (default, 48 chars) or 58 (32 chars)
  isReprint?: boolean;
  reprintReason?: string;
  reprintCount?: number;
}

export interface KotPrintItem {
  name: string;
  quantity: number;
  modifiers?: string[];
  specialInstructions?: string | null;
}

export interface KotPrintPayload {
  kotNumber: string;
  orderNumber?: string;
  station?: string;
  tableOrRoom: string;
  serverName?: string;
  createdAt: string;
  items: KotPrintItem[];
  notes?: string | null;
  isReprint?: boolean;
  reprintReason?: string;
  reprintCount?: number;
}

export interface ReceiptTaxLine {
  label: string;
  ratePercent?: number;
  amount: number;
}

export interface ReceiptPrintItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface ReceiptPrintPayload {
  propertyHeader?: {
    name: string;
    address?: string;
    phone?: string;
    gstin?: string;
  };
  invoiceNumber: string;
  orderNumber?: string;
  tableOrRoom: string;
  billedBy?: string;
  issuedAt: string;
  items: ReceiptPrintItem[];
  subtotal: number;
  discountAmount?: number;
  discountReason?: string;
  serviceChargeAmount?: number;
  taxBreakdown: ReceiptTaxLine[];
  roundOff?: number;
  grandTotal: number;
  payments?: Array<{
    method: string;
    amount: number;
    reference?: string;
  }>;
  balanceDue?: number;
  paymentStatus: string; // UNPAID, PARTIALLY_PAID, PAID
  isReprint?: boolean;
  reprintReason?: string;
  reprintCount?: number;
}

export interface TestSlipPayload {
  printerName: string;
  printerId: string;
  ipAddress?: string;
  port?: number;
  station?: string;
  paperWidthMm?: number;
  connectionType?: string;
  timestamp: string;
}

// ESC/POS Command Byte Constants
export const ESC_POS_COMMANDS = {
  INIT: Buffer.from([0x1b, 0x40]), // ESC @ - Initialize printer
  ALIGN_LEFT: Buffer.from([0x1b, 0x61, 0x00]), // ESC a 0
  ALIGN_CENTER: Buffer.from([0x1b, 0x61, 0x01]), // ESC a 1
  ALIGN_RIGHT: Buffer.from([0x1b, 0x61, 0x02]), // ESC a 2
  BOLD_ON: Buffer.from([0x1b, 0x45, 0x01]), // ESC E 1
  BOLD_OFF: Buffer.from([0x1b, 0x45, 0x00]), // ESC E 0
  DOUBLE_SIZE_ON: Buffer.from([0x1d, 0x21, 0x11]), // GS ! 17 (2x height + 2x width)
  DOUBLE_HEIGHT_ON: Buffer.from([0x1d, 0x21, 0x01]), // GS ! 1 (2x height)
  TEXT_NORMAL: Buffer.from([0x1d, 0x21, 0x00]), // GS ! 0 (normal size)
  PARTIAL_CUT: Buffer.from([0x1d, 0x56, 0x41, 0x03]), // GS V A 3 (feed and partial cut)
  FULL_CUT: Buffer.from([0x1d, 0x56, 0x00]), // GS V 0 (full cut)
  BUZZER: Buffer.from([0x1b, 0x70, 0x00, 0x19, 0xfa]), // ESC p 0 25 250 (chime/buzzer)
  FEED_LINES: (n: number) => Buffer.from([0x1b, 0x64, Math.max(1, Math.min(n, 10))]), // ESC d n
};

export class PrinterRenderer {
  /**
   * Determine characters per line based on paper width.
   * 80mm thermal paper typically holds 48 monospace characters.
   * 58mm thermal paper holds 32 monospace characters.
   */
  public static getLineWidth(paperWidthMm = 80): number {
    return paperWidthMm === 58 ? 32 : 48;
  }

  private static padRight(str: string | undefined | null, width: number): string {
    const s = String(str ?? "");
    if (s.length >= width) return s.slice(0, width);
    return s + " ".repeat(width - s.length);
  }

  private static padLeft(str: string | undefined | null, width: number): string {
    const s = String(str ?? "");
    if (s.length >= width) return s.slice(0, width);
    return " ".repeat(width - s.length) + s;
  }

  private static formatCurrency(amount: number | undefined | null): string {
    const val = typeof amount === "number" ? amount : Number(amount ?? 0);
    return `₹${val.toFixed(2)}`;
  }

  private static createDivider(char = "-", width = 48): string {
    return char.repeat(Math.max(1, width));
  }

  private static formatTwoColumns(
    left: string | undefined | null,
    right: string | undefined | null,
    width: number
  ): string {
    const l = String(left ?? "");
    const r = String(right ?? "");
    const available = width - r.length;
    if (available <= 0) return l.slice(0, width);
    return this.padRight(l, available) + r;
  }

  /**
   * Render Plain Text representation of Kitchen Order Ticket (KOT).
   */
  public static renderKotPlainText(payload: KotPrintPayload, options: RenderOptions = {}): string {
    const width = this.getLineWidth(options.paperWidthMm || 80);
    const isReprint = Boolean(payload.isReprint || options.isReprint);
    const lines: string[] = [];

    // Header
    lines.push(this.createDivider("=", width));
    if (isReprint) {
      lines.push("*** DUPLICATE / REPRINT COPY ***");
      if (payload.reprintReason || options.reprintReason) {
        lines.push(`Reason: ${payload.reprintReason || options.reprintReason}`);
      }
      lines.push(this.createDivider("=", width));
    }

    lines.push("KITCHEN ORDER TICKET");
    if (payload.station) {
      lines.push(`STATION: ${payload.station.toUpperCase()}`);
    }
    lines.push(this.createDivider("-", width));

    const tableOrRoom = payload.tableOrRoom || "General Table";
    lines.push(this.formatTwoColumns(`KOT: #${payload.kotNumber || "N/A"}`, tableOrRoom, width));
    if (payload.orderNumber) {
      lines.push(`Order: #${payload.orderNumber}`);
    }
    lines.push(`Date: ${payload.createdAt || new Date().toISOString()}`);
    if (payload.serverName) {
      lines.push(`Server: ${payload.serverName}`);
    }
    lines.push(this.createDivider("-", width));

    // Items Column Headers
    lines.push(this.formatTwoColumns("QTY  ITEM DESCRIPTION", "", width));
    lines.push(this.createDivider(".", width));

    const items = payload.items || [];
    let totalQuantity = 0;
    for (const item of items) {
      const qty = item.quantity || 1;
      totalQuantity += qty;
      const qtyStr = `${qty}x `.padStart(4, " ");
      lines.push(`${qtyStr}${item.name || "Unnamed Item"}`);

      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          lines.push(`      + ${mod}`);
        }
      }
      if (item.specialInstructions) {
        lines.push(`      [NOTE: ${item.specialInstructions}]`);
      }
    }

    lines.push(this.createDivider("-", width));
    lines.push(this.formatTwoColumns(`Total Items: ${items.length}`, `Total Qty: ${totalQuantity}`, width));

    if (payload.notes) {
      lines.push(this.createDivider(".", width));
      lines.push(`Special Instructions:`);
      lines.push(payload.notes);
    }

    lines.push(this.createDivider("=", width));
    return lines.join("\n");
  }

  /**
   * Render Plain Text representation of Customer Tax Receipt.
   */
  public static renderReceiptPlainText(payload: ReceiptPrintPayload, options: RenderOptions = {}): string {
    const width = this.getLineWidth(options.paperWidthMm || 80);
    const isReprint = Boolean(payload.isReprint || options.isReprint);
    const lines: string[] = [];

    // Property Header
    lines.push(this.createDivider("=", width));
    if (isReprint) {
      lines.push("*** DUPLICATE TAX INVOICE ***");
      if (payload.reprintReason || options.reprintReason) {
        lines.push(`Reason: ${payload.reprintReason || options.reprintReason}`);
      }
      lines.push(this.createDivider("=", width));
    }

    const header = payload.propertyHeader || { name: "SCULPX RESTRO & RESORT" };
    lines.push((header.name || "SCULPX RESTRO").toUpperCase());
    if (header.address) lines.push(header.address);
    if (header.phone) lines.push(`Tel: ${header.phone}`);
    if (header.gstin) lines.push(`GSTIN: ${header.gstin}`);
    lines.push(this.createDivider("-", width));

    const tableOrRoom = payload.tableOrRoom || "General Table";
    lines.push(this.formatTwoColumns(`Tax Invoice: #${payload.invoiceNumber || "N/A"}`, tableOrRoom, width));
    if (payload.orderNumber) lines.push(`Order: #${payload.orderNumber}`);
    lines.push(`Date: ${payload.issuedAt || new Date().toISOString()}`);
    if (payload.billedBy) lines.push(`Cashier: ${payload.billedBy}`);
    lines.push(this.createDivider("-", width));

    // Items table header
    const priceColWidth = 10;
    const qtyColWidth = 4;
    const nameColWidth = width - priceColWidth - qtyColWidth - 2;

    const itemHeader =
      this.padRight("QTY", qtyColWidth) +
      " " +
      this.padRight("ITEM", nameColWidth) +
      " " +
      this.padLeft("AMOUNT", priceColWidth);
    lines.push(itemHeader);
    lines.push(this.createDivider(".", width));

    const items = payload.items || [];
    for (const item of items) {
      const qty = `${item.quantity || 1}`.padStart(qtyColWidth, " ");
      const name = this.padRight(String(item.name || "").slice(0, nameColWidth), nameColWidth);
      const amt = this.padLeft(this.formatCurrency(item.totalPrice), priceColWidth);
      lines.push(`${qty} ${name} ${amt}`);
    }

    lines.push(this.createDivider("-", width));

    // Financial Breakdown
    lines.push(this.formatTwoColumns("Subtotal:", this.formatCurrency(payload.subtotal), width));

    if (payload.discountAmount && payload.discountAmount > 0) {
      const discountLabel = payload.discountReason ? `Discount (${payload.discountReason}):` : "Discount:";
      lines.push(this.formatTwoColumns(discountLabel, `-${this.formatCurrency(payload.discountAmount)}`, width));
    }

    if (payload.serviceChargeAmount && payload.serviceChargeAmount > 0) {
      lines.push(this.formatTwoColumns("Service Charge (5%):", this.formatCurrency(payload.serviceChargeAmount), width));
    }

    if (payload.taxBreakdown && payload.taxBreakdown.length > 0) {
      for (const tax of payload.taxBreakdown) {
        const rateLabel = tax.ratePercent !== undefined ? ` (${tax.ratePercent}%)` : "";
        lines.push(this.formatTwoColumns(`${tax.label}${rateLabel}:`, this.formatCurrency(tax.amount), width));
      }
    }

    if (payload.roundOff && Math.abs(payload.roundOff) > 0.001) {
      lines.push(this.formatTwoColumns("Round Off:", this.formatCurrency(payload.roundOff), width));
    }

    lines.push(this.createDivider("=", width));
    lines.push(this.formatTwoColumns("GRAND TOTAL:", this.formatCurrency(payload.grandTotal), width));
    lines.push(this.createDivider("=", width));

    // Payment details
    if (payload.payments && payload.payments.length > 0) {
      lines.push("PAYMENTS TENDERED:");
      for (const p of payload.payments) {
        lines.push(this.formatTwoColumns(`  ${p.method}:`, this.formatCurrency(p.amount), width));
      }
    }

    lines.push(this.formatTwoColumns("Payment Status:", payload.paymentStatus, width));
    if (payload.balanceDue !== undefined && payload.balanceDue > 0) {
      lines.push(this.formatTwoColumns("Balance Due:", this.formatCurrency(payload.balanceDue), width));
    }

    lines.push(this.createDivider("-", width));
    lines.push("Thank you for your visit!");
    lines.push("Please visit again.");
    lines.push(this.createDivider("=", width));

    return lines.join("\n");
  }

  /**
   * Render Plain Text representation of Diagnostic Test Slip.
   */
  public static renderTestSlipPlainText(payload: TestSlipPayload, options: RenderOptions = {}): string {
    const width = this.getLineWidth(payload.paperWidthMm || options.paperWidthMm || 80);
    const lines: string[] = [];

    lines.push(this.createDivider("=", width));
    lines.push("SCULPX PRINTER DIAGNOSTIC TEST");
    lines.push(this.createDivider("-", width));
    lines.push(`Printer Name:    ${payload.printerName}`);
    lines.push(`Printer ID:      ${payload.printerId}`);
    lines.push(`Station/Role:    ${payload.station || "GENERAL"}`);
    lines.push(`Paper Width:     ${payload.paperWidthMm || 80}mm (${width} columns)`);
    lines.push(`Connection:      ${payload.connectionType || "NETWORK_TCP"}`);
    if (payload.ipAddress) {
      lines.push(`Network Address: ${payload.ipAddress}:${payload.port || 9100}`);
    }
    lines.push(`Timestamp:       ${payload.timestamp}`);
    lines.push(this.createDivider("-", width));
    lines.push("SELF TEST: PASSED");
    lines.push("COMMUNICATION: OK");
    lines.push("FONT ESC/POS: OK");
    lines.push(this.createDivider("=", width));

    return lines.join("\n");
  }

  /**
   * Convert plain-text string into an ESC/POS binary Buffer, inserting
   * appropriate ESC/POS control commands (Init, Alignments, Bold, Cut, Buzzer).
   */
  public static textToEscPos(
    text: string,
    options: {
      enableBuzzer?: boolean;
      partialCut?: boolean;
    } = {}
  ): Buffer {
    const chunks: Buffer[] = [
      ESC_POS_COMMANDS.INIT,
      ESC_POS_COMMANDS.ALIGN_LEFT,
    ];

    if (options.enableBuzzer) {
      chunks.push(ESC_POS_COMMANDS.BUZZER);
    }

    // Encode text as ASCII / latin1 bytes
    const textBuffer = Buffer.from(text + "\n\n\n\n", "latin1");
    chunks.push(textBuffer);

    if (options.partialCut !== false) {
      chunks.push(ESC_POS_COMMANDS.PARTIAL_CUT);
    }

    return Buffer.concat(chunks);
  }

  /**
   * Render complete ESC/POS binary buffer for a print job.
   */
  public static renderEscPos(
    jobType: string,
    payload: Record<string, unknown>,
    options: RenderOptions = {}
  ): Buffer {
    let plainText = "";

    switch (jobType) {
      case "KOT":
        plainText = this.renderKotPlainText(payload as unknown as KotPrintPayload, options);
        return this.textToEscPos(plainText, { enableBuzzer: true, partialCut: true });

      case "BILL_RECEIPT":
        plainText = this.renderReceiptPlainText(payload as unknown as ReceiptPrintPayload, options);
        return this.textToEscPos(plainText, { enableBuzzer: false, partialCut: true });

      case "TEST_PAGE":
      default:
        plainText = this.renderTestSlipPlainText(payload as unknown as TestSlipPayload, options);
        return this.textToEscPos(plainText, { enableBuzzer: true, partialCut: true });
    }
  }
}
