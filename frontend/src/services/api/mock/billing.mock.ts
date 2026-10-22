import { IBillingService } from "../interfaces";
import { ApiResponse, Bill, Order, PaginatedResult, PaginationParams } from "@/types";
import { MOCK_BILLS, MOCK_ORDERS } from "@/mocks/mockDb";

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockBillingService implements IBillingService {
  private bills: Bill[] = MOCK_BILLS;

  async getBillById(id: string): Promise<ApiResponse<Bill>> {
    await delay(100);
    let bill = this.bills.find((b) => b.id === id);
    if (!bill) {
      // Fallback check: maybe the route passed an orderId
      const byOrder = this.bills.find((b) => b.orderId === id);
      if (byOrder) return { success: true, data: byOrder };

      if (id.startsWith("ord-")) {
        return this.getBillByOrderId(id);
      }

      return {
        success: false,
        data: null as unknown as Bill,
        error: { code: "BILL_NOT_FOUND", message: "Bill not found" },
      };
    }
    return { success: true, data: bill };
  }

  async getBillByOrderId(orderId: string): Promise<ApiResponse<Bill>> {
    await delay(120);
    let bill = this.bills.find((b) => b.orderId === orderId);
    if (!bill) {
      const genRes = await this.generateBillForOrder(orderId);
      if (!genRes.success) return genRes;
      bill = genRes.data;
    }
    return { success: true, data: bill };
  }

  async getAllBills(params?: {
    status?: string;
    pagination?: PaginationParams;
  }): Promise<ApiResponse<PaginatedResult<Bill>>> {
    await delay(150);
    let filtered = [...this.bills];
    if (params?.status) {
      filtered = filtered.filter((b) => b.status === params.status);
    }
    const page = params?.pagination?.page || 1;
    const limit = params?.pagination?.limit || 10;
    const total = filtered.length;
    const data = filtered.slice((page - 1) * limit, page * limit);

    return {
      success: true,
      data: {
        data,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async generateBillForOrder(orderId: string): Promise<ApiResponse<Bill>> {
    await delay(200);
    let order: Order | undefined = MOCK_ORDERS.find((o) => o.id === orderId);
    if (!order) {
      const fallbackOrder: Order = {
        id: orderId,
        orderNumber: `ORD-${Date.now().toString().slice(-4)}`,
        qrContext: {
          token: "table-token-5",
          type: "TABLE",
          identifier: "05",
          displayName: "Table 05",
          hotelId: "hotel-1",
          hotelName: "Grand Palace",
          isActive: true,
        },
        paymentPreference: "PAY_LATER",
        source: "STAFF_POS",
        status: "SERVED",
        items: [
          {
            id: `item-${Date.now()}-1`,
            menuItemId: "item-1",
            name: "Test Special Tikka",
            quantity: 2,
            unitPrice: 400,
            totalPrice: 800,
            taxRatePercentage: 5,
            taxAmount: 40,
            modifiers: [],
            status: "SERVED",
          },
        ],
        subtotal: 800,
        taxTotal: 40,
        discountTotal: 0,
        grandTotal: 840,
        timeline: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      MOCK_ORDERS.push(fallbackOrder);
      order = fallbackOrder;
    }

    const currentOrder = order!;
    const billItems = currentOrder.items.map((oi) => ({
      id: `bi-${oi.id}`,
      name: oi.name,
      quantity: oi.quantity,
      unitPrice: oi.unitPrice,
      totalPrice: oi.totalPrice,
    }));

    const taxAmount = Math.round(currentOrder.subtotal * 0.05 * 100) / 100;
    const grandTotal = currentOrder.subtotal + taxAmount;

    const newBill: Bill = {
      id: `bill-${Date.now()}`,
      billNumber: `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      orderId: currentOrder.id,
      orderNumber: currentOrder.orderNumber,
      qrContext: currentOrder.qrContext,
      status: "ISSUED",
      items: billItems,
      subtotal: currentOrder.subtotal,
      discounts: [],
      totalDiscount: 0,
      taxes: [
        { name: "CGST (2.5%)", ratePercentage: 2.5, amount: taxAmount / 2 },
        { name: "SGST (2.5%)", ratePercentage: 2.5, amount: taxAmount / 2 },
      ],
      totalTax: taxAmount,
      roundOff: 0,
      grandTotal,
      paidAmount: 0,
      dueAmount: grandTotal,
      payments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.bills.push(newBill);
    currentOrder.billId = newBill.id;

    return { success: true, data: newBill, message: "Bill generated" };
  }

  async applyDiscount(
    billId: string,
    discount: { type: "PERCENTAGE" | "FLAT"; value: number; code?: string },
  ): Promise<ApiResponse<Bill>> {
    await delay(150);
    const bill = this.bills.find((b) => b.id === billId);
    if (!bill) {
      return {
        success: false,
        data: null as unknown as Bill,
        error: { code: "BILL_NOT_FOUND", message: "Bill not found" },
      };
    }

    const discountAmount =
      discount.type === "PERCENTAGE"
        ? Math.round((bill.subtotal * (discount.value / 100)) * 100) / 100
        : discount.value;

    bill.discounts.push({
      type: discount.type,
      value: discount.value,
      amount: discountAmount,
      code: discount.code,
      authorizedBy: "Manager",
    });

    bill.totalDiscount += discountAmount;
    const discountedSubtotal = Math.max(0, bill.subtotal - bill.totalDiscount);
    const newTax = Math.round(discountedSubtotal * 0.05 * 100) / 100;
    const newGrandTotal = discountedSubtotal + newTax;

    if (newGrandTotal < bill.paidAmount) {
      // Revert discount addition
      bill.totalDiscount -= discountAmount;
      bill.discounts.pop();
      return {
        success: false,
        data: null as unknown as Bill,
        error: {
          code: "INVALID_DISCOUNT",
          message: `Discount would reduce grand total (${newGrandTotal}) below already collected amount (${bill.paidAmount})`,
        },
      };
    }

    bill.totalTax = newTax;
    bill.grandTotal = newGrandTotal;
    bill.dueAmount = Math.max(0, Number((bill.grandTotal - bill.paidAmount).toFixed(2)));
    bill.updatedAt = new Date().toISOString();

    return { success: true, data: bill, message: "Discount applied" };
  }

  async voidBill(billId: string, reason: string): Promise<ApiResponse<Bill>> {
    await delay(150);
    const bill = this.bills.find((b) => b.id === billId);
    if (!bill) {
      return {
        success: false,
        data: null as unknown as Bill,
        error: { code: "BILL_NOT_FOUND", message: "Bill not found" },
      };
    }

    if (bill.paidAmount > 0 || (bill.payments && bill.payments.length > 0)) {
      return {
        success: false,
        data: null as unknown as Bill,
        error: {
          code: "CANNOT_VOID_SETTLED_BILL",
          message: "Cannot void a bill with recorded payments. Payments must be refunded first.",
        },
      };
    }

    bill.status = "VOIDED";
    bill.voidedReason = reason;
    bill.updatedAt = new Date().toISOString();

    return { success: true, data: bill, message: "Bill voided" };
  }
}
