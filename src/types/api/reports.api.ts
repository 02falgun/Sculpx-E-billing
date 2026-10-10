/**
 * SCULPX E-Billing — Reports & Operational Telemetry Contracts
 */

export interface SalesReportQueryParams {
  startDate: string;
  endDate: string;
  stationId?: string;
}

export interface SalesReportResponseBody {
  grossSales: number;
  netSales: number;
  totalOrders: number;
  averageOrderValue: number;
  taxRemittance: {
    cgst: number;
    sgst: number;
    totalTax: number;
  };
  totalDiscounts: number;
  salesByCategory: {
    categoryId: string;
    categoryName: string;
    totalAmount: number;
    itemCount: number;
  }[];
  paymentBreakdown: {
    method: string;
    totalAmount: number;
    transactionCount: number;
  }[];
}

export interface ShiftPerformanceReportResponseBody {
  averageTicketValue: number;
  averageTurnTimeMinutes: number;
  totalCovers: number;
  peakOrderingHours: {
    hour: number; // 0-23
    orderCount: number;
  }[];
}

export interface InventoryValuationReportResponseBody {
  totalInventoryValuation: number;
  lowStockItemsCount: number;
  totalWastageValue: number;
}
