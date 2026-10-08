import { IOrderService } from "../interfaces";
import {
  ApiResponse,
  CreateOrderPayload,
  Order,
  OrderStatus,
  OrderValidationResult,
  PaginatedResult,
  PaginationParams,
  KOT,
  Bill,
} from "@/types";
import {
  MOCK_ORDERS,
  MOCK_MENU_ITEMS,
  MOCK_QR_CONTEXTS,
  MOCK_KOTS,
  MOCK_BILLS,
  MOCK_TABLES,
} from "@/mocks/mockDb";

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockOrderService implements IOrderService {
  private orders: Order[] = MOCK_ORDERS;

  async validateOrder(payload: CreateOrderPayload): Promise<ApiResponse<OrderValidationResult>> {
    await delay(100);
    let subtotal = 0;
    const unavailable: { menuItemId: string; reason: string }[] = [];

    for (const itemInput of payload.items) {
      const item = MOCK_MENU_ITEMS.find((m) => m.id === itemInput.menuItemId);
      if (!item) {
        unavailable.push({ menuItemId: itemInput.menuItemId, reason: "Item does not exist" });
      } else if (!item.isAvailable) {
        unavailable.push({ menuItemId: itemInput.menuItemId, reason: "Item is sold out" });
      } else {
        let unitPrice = item.price;
        if (item.modifierGroups && itemInput.modifierIds?.length) {
          for (const mg of item.modifierGroups) {
            for (const m of mg.modifiers) {
              if (itemInput.modifierIds.includes(m.id)) {
                unitPrice += m.price;
              }
            }
          }
        }
        subtotal += unitPrice * itemInput.quantity;
      }
    }

    const calculatedTax = Math.round(subtotal * 0.05 * 100) / 100;
    const calculatedGrandTotal = subtotal + calculatedTax;

    return {
      success: unavailable.length === 0,
      data: {
        isValid: unavailable.length === 0,
        unavailableItems: unavailable,
        priceDiscrepancies: [],
        calculatedSubtotal: subtotal,
        calculatedTax,
        calculatedGrandTotal,
      },
    };
  }

  async createOrder(payload: CreateOrderPayload): Promise<ApiResponse<Order>> {
    await delay(250);
    const context = MOCK_QR_CONTEXTS[payload.qrToken] || {
      token: payload.qrToken,
      type: "TABLE",
      identifier: "Quick POS",
      displayName: "Counter POS",
      hotelId: "htl-grand-1",
      hotelName: "The Grand Royal Palace & Resort",
      isActive: true,
    };

    let subtotal = 0;
    const orderItems = payload.items.map((inp, idx) => {
      const menuItem = MOCK_MENU_ITEMS.find((m) => m.id === inp.menuItemId) || {
        name: "Special Item",
        price: 250,
      };
      let unitPrice = menuItem.price;
      const mods: { modifierId: string; name: string; price: number }[] = [];

      if ("modifierGroups" in menuItem && menuItem.modifierGroups && inp.modifierIds?.length) {
        for (const mg of menuItem.modifierGroups) {
          for (const m of mg.modifiers) {
            if (inp.modifierIds.includes(m.id)) {
              unitPrice += m.price;
              mods.push({ modifierId: m.id, name: m.name, price: m.price });
            }
          }
        }
      }

      const totalItemPrice = unitPrice * inp.quantity;
      subtotal += totalItemPrice;

      return {
        id: `oi-${Date.now()}-${idx}`,
        menuItemId: inp.menuItemId,
        name: menuItem.name,
        quantity: inp.quantity,
        unitPrice,
        totalPrice: totalItemPrice,
        taxRatePercentage: 5,
        taxAmount: Math.round(totalItemPrice * 0.05 * 100) / 100,
        modifiers: mods,
        specialInstructions: inp.specialInstructions,
        status: "PLACED" as const,
      };
    });

    const taxTotal = Math.round(subtotal * 0.05 * 100) / 100;
    const grandTotal = subtotal + taxTotal;
    const orderId = `ord-${Date.now()}`;
    const orderNumber = `ORD-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      qrContext: context,
      status: "PLACED",
      source: "CUSTOMER_QR",
      paymentPreference: payload.paymentPreference,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      specialInstructions: payload.specialInstructions,
      items: orderItems,
      subtotal,
      taxTotal,
      discountTotal: 0,
      grandTotal,
      timeline: [
        {
          status: "PLACED",
          timestamp: new Date().toISOString(),
          note: `Order received from ${context.displayName}`,
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.orders.unshift(newOrder);

    // 1. Synchronize to Kitchen KDS (create new KOT ticket)
    const kotId = `kot-${Date.now()}`;
    const newKOT: KOT = {
      id: kotId,
      kotNumber: `KOT-${Math.floor(1000 + Math.random() * 9000)}`,
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      qrContext: context,
      status: "NEW",
      urgency: "NORMAL",
      items: newOrder.items.map((it) => ({
        id: it.id,
        menuItemId: it.menuItemId,
        name: it.name,
        quantity: it.quantity,
        modifiers: it.modifiers,
        specialInstructions: it.specialInstructions,
        status: "PENDING",
      })),
      specialNotes: payload.specialInstructions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    MOCK_KOTS.unshift(newKOT);

    // 2. Synchronize to Cashier Invoices (create new Bill)
    const billId = `bill-${Date.now()}`;
    const newBill: Bill = {
      id: billId,
      billNumber: `BILL-${Math.floor(1000 + Math.random() * 9000)}`,
      orderId: newOrder.id,
      orderNumber: newOrder.orderNumber,
      qrContext: context,
      status: "ISSUED",
      items: newOrder.items.map((it) => ({
        id: it.id,
        name: it.name,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
      })),
      subtotal: newOrder.subtotal,
      discounts: [],
      totalDiscount: 0,
      taxes: [
        { name: "CGST (2.5%)", ratePercentage: 2.5, amount: Math.round(newOrder.subtotal * 0.025 * 100) / 100 },
        { name: "SGST (2.5%)", ratePercentage: 2.5, amount: Math.round(newOrder.subtotal * 0.025 * 100) / 100 },
      ],
      totalTax: newOrder.taxTotal,
      roundOff: 0,
      grandTotal: newOrder.grandTotal,
      paidAmount: 0,
      dueAmount: newOrder.grandTotal,
      payments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    MOCK_BILLS.unshift(newBill);

    // 3. Synchronize to Waiter Floor Tables
    if (context.type === "TABLE") {
      const cleanIdent = context.identifier.replace(/^0+/, "");
      const tbl = MOCK_TABLES.find(
        (t) => t.tableNumber === context.identifier || t.tableNumber === cleanIdent
      );
      if (tbl) {
        tbl.status = "OCCUPIED";
        tbl.activeOrderId = newOrder.id;
        tbl.activeBillId = newBill.id;
      }
    }

    return { success: true, data: newOrder, message: "Order placed successfully" };
  }

  async getOrderById(id: string): Promise<ApiResponse<Order>> {
    await delay(100);
    const order = this.orders.find((o) => o.id === id);
    if (!order) {
      return {
        success: false,
        data: null as unknown as Order,
        error: { code: "ORDER_NOT_FOUND", message: "Order not found" },
      };
    }
    return { success: true, data: order };
  }

  async getOrders(params?: {
    status?: OrderStatus;
    qrType?: "ROOM" | "TABLE";
    pagination?: PaginationParams;
  }): Promise<ApiResponse<PaginatedResult<Order>>> {
    await delay(150);
    let filtered = [...this.orders];

    if (params?.status) {
      filtered = filtered.filter((o) => o.status === params.status);
    }
    if (params?.qrType) {
      filtered = filtered.filter((o) => o.qrContext.type === params.qrType);
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

  async updateOrderStatus(
    id: string,
    status: OrderStatus,
    note?: string,
  ): Promise<ApiResponse<Order>> {
    await delay(150);
    const order = this.orders.find((o) => o.id === id);
    if (!order) {
      return {
        success: false,
        data: null as unknown as Order,
        error: { code: "ORDER_NOT_FOUND", message: "Order not found" },
      };
    }
    order.status = status;
    order.updatedAt = new Date().toISOString();
    order.timeline.push({
      status,
      timestamp: new Date().toISOString(),
      note: note || `Status transitioned to ${status}`,
    });

    return { success: true, data: order, message: `Status updated to ${status}` };
  }

  async cancelOrder(id: string, reason: string): Promise<ApiResponse<Order>> {
    await delay(200);
    const order = this.orders.find((o) => o.id === id);
    if (!order) {
      return {
        success: false,
        data: null as unknown as Order,
        error: { code: "ORDER_NOT_FOUND", message: "Order not found" },
      };
    }

    // Cancellation rule check: cannot cancel if PREPARING or READY
    if (order.status === "PREPARING" || order.status === "READY" || order.status === "SERVED") {
      return {
        success: false,
        data: null as unknown as Order,
        error: {
          code: "ORDER_CANNOT_BE_CANCELLED",
          message: "Food is already in preparation or ready. Please contact floor staff for assistance.",
        },
      };
    }

    order.status = "CANCELLED";
    order.cancellation = {
      reason,
      cancelledAt: new Date().toISOString(),
      cancelledBy: "CUSTOMER",
      refundStatus: order.paymentPreference === "PAY_NOW" ? "PENDING" : "NOT_APPLICABLE",
    };
    order.timeline.push({
      status: "CANCELLED",
      timestamp: new Date().toISOString(),
      note: `Cancelled: ${reason}`,
    });

    return { success: true, data: order, message: "Order cancelled" };
  }
}
