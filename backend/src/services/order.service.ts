import {
  Prisma,
  OrderStatus,
  OrderSource,
  PaymentPreference,
  KotStatus,
  type Kot,
  type Order,
  type OrderItem,
} from "@prisma/client";
import { withTransaction } from "../database/prisma.js";
import { ensureFound } from "../lib/guards.js";
import { orderModel } from "../models/order.model.js";
import { kotModel } from "../models/kot.model.js";
import { tableModel } from "../models/table.model.js";
import { printerModel } from "../models/printer.model.js";
import { printJobModel } from "../models/print-job.model.js";
import { qrService } from "./qr.service.js";
import { cartService } from "./cart.service.js";
import { sequenceService } from "./sequence.service.js";
import { idempotencyService } from "./idempotency.service.js";
import { outboxService } from "./outbox.service.js";
import { inventoryService } from "./inventory.service.js";
import { logger } from "../lib/logger.js";
import { BadRequestError, ConflictError, UnauthorizedError } from "../lib/errors.js";
import { ErrorCode } from "../constants/error-codes.js";
import type { CreateOrderRequest } from "../validations/order.validation.js";
import type { ValidatedQrEntity } from "../types/qr.types.js";
import type {
  CreateOrderOptions,
  CreateOrderResponse,
  CreatedOrderItemResponse,
  ListOrdersParams,
  OrderListResponse,
  OrderResponse,
  OrderTimelineEntry,
  OrderWithDetails,
  ValidatedLineItem,
} from "../types/order.types.js";

const STAFF_ROLES = ["WAITER", "CAPTAIN", "MANAGER", "ADMIN", "SUPER_ADMIN"];

interface CreatedLine {
  orderItem: OrderItem;
  lineItem: ValidatedLineItem;
}

interface DiningLabels {
  identifier: string;
  displayName: string;
  roomOrTableId: string;
}

// resolveValidatedQrEntity guarantees the table (TABLE) or room (ROOM) is present.
function diningLabels(qr: ValidatedQrEntity): DiningLabels {
  if (qr.type === "TABLE") {
    const table = qr.table!;
    return {
      identifier: table.tableNumber,
      displayName: table.displayName || `Table ${table.tableNumber}`,
      roomOrTableId: table.id,
    };
  }
  const room = qr.room!;
  return {
    identifier: room.roomNumber,
    displayName: `Room ${room.roomNumber}`,
    roomOrTableId: room.id,
  };
}

/** Staff may choose the order source (default STAFF_POS); everyone else is CUSTOMER_QR. */
function resolveOrderSource(userRole: string | undefined, requested: OrderSource | undefined): OrderSource {
  const isStaff = userRole && STAFF_ROLES.includes(userRole);
  return isStaff ? requested || OrderSource.STAFF_POS : OrderSource.CUSTOMER_QR;
}

/** `selectedModifiers` is stored as a JSON array; tolerate legacy stringified values. */
function parseSelectedModifiers(value: Prisma.JsonValue): Prisma.JsonValue {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as Prisma.JsonValue;
    } catch {
      // Malformed legacy value: fall through to an empty list
    }
  }
  return [];
}

/**
 * Queue the KOT on the station's kitchen printer, if one exists.
 * A print-queue problem must never abort the order transaction, so errors are only logged.
 */
async function queueKotPrintJob(
  tx: Prisma.TransactionClient,
  params: {
    tenantId: string;
    order: Order;
    kot: Kot;
    qr: ValidatedQrEntity;
    displayName: string;
    lines: CreatedLine[];
  }
): Promise<void> {
  const { tenantId, order, kot, qr, displayName, lines } = params;
  try {
    const kitchenPrinter = await printerModel.findKitchenForStation(tenantId, kot.station, tx);
    if (!kitchenPrinter) return;

    await printJobModel.createWithoutPrinter(
      {
        tenantId,
        printerId: kitchenPrinter.id,
        jobType: "KOT",
        referenceId: kot.id,
        payload: {
          kotNumber: kot.kotNumber,
          orderNumber: order.orderNumber,
          station: kot.station,
          tableOrRoom: displayName,
          serverName: qr.type === "TABLE" ? "Customer QR" : "Room QR",
          createdAt: kot.createdAt.toISOString(),
          items: lines.map(({ orderItem, lineItem }) => ({
            name: orderItem.itemName,
            quantity: orderItem.quantity,
            modifiers: lineItem.modifiers.map((m) => m.name),
            specialInstructions: orderItem.specialInstructions,
          })),
          notes: qr.type === "TABLE" ? "Customer QR Order" : "Room QR Order",
        },
        status: "QUEUED",
        idempotencyKey: `kot-print-${kot.id}`,
        initiatedBy: "Order Confirmation (Auto-KOT)",
      },
      tx
    );
  } catch (printErr) {
    logger.warn({ msg: "Could not auto-queue KOT print job", err: printErr });
  }
}

function buildCreateOrderResponse(params: {
  order: Order;
  kot: Kot;
  qr: ValidatedQrEntity;
  qrToken: string;
  dining: DiningLabels;
  lines: CreatedLine[];
}): CreateOrderResponse {
  const { order, kot, qr, qrToken, dining, lines } = params;

  const items: CreatedOrderItemResponse[] = lines.map(({ orderItem, lineItem }) => ({
    id: orderItem.id,
    menuItemId: orderItem.menuItemId,
    itemName: orderItem.itemName,
    quantity: orderItem.quantity,
    unitPrice: Number(orderItem.unitPrice),
    totalPrice: Number(orderItem.totalPrice),
    taxAmount: Number(orderItem.taxAmount),
    modifiers: lineItem.modifiers,
    specialInstructions: orderItem.specialInstructions,
    status: orderItem.status,
  }));

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    source: order.source,
    paymentPreference: order.paymentPreference,
    subtotal: Number(order.subtotal),
    taxTotal: Number(order.taxTotal),
    serviceCharge: Number(order.serviceCharge),
    grandTotal: Number(order.grandTotal),
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    specialInstructions: order.specialInstructions,
    diningContext: {
      type: qr.type,
      identifier: dining.identifier,
      displayName: dining.displayName,
      roomOrTableId: dining.roomOrTableId,
    },
    qrContext: {
      token: qrToken,
      type: qr.type,
      identifier: dining.identifier,
      displayName: dining.displayName,
      tenantId: qr.tenantId,
    },
    timeline: [
      {
        status: "PLACED",
        timestamp: order.createdAt.toISOString(),
        note: "Order placed by guest",
      },
    ],
    items,
    assignedKotIds: [kot.id],
    kots: [
      {
        id: kot.id,
        kotNumber: kot.kotNumber,
        status: kot.status,
        station: kot.station,
        itemCount: lines.length,
        createdAt: kot.createdAt.toISOString(),
      },
    ],
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      source: order.source,
      paymentPreference: order.paymentPreference,
      subtotal: Number(order.subtotal),
      taxTotal: Number(order.taxTotal),
      grandTotal: Number(order.grandTotal),
      items,
      createdAt: order.createdAt.toISOString(),
    },
  };
}

/** Format a database order (with details) into the API response shape. */
function formatOrderEntity(order: OrderWithDetails): OrderResponse {
  const qrType = order.tableId ? "TABLE" : order.roomId ? "ROOM" : order.qrCode?.type || "TABLE";
  const identifier = order.table?.tableNumber || order.room?.roomNumber || "Unknown";
  const displayName = order.table
    ? order.table.displayName || `Table ${order.table.tableNumber}`
    : order.room
    ? `Room ${order.room.roomNumber}`
    : `Table ${identifier}`;

  const items = order.items.map((item) => ({
    id: item.id,
    menuItemId: item.menuItemId || "",
    name: item.itemName,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    totalPrice: Number(item.totalPrice),
    taxRatePercentage: 5,
    taxAmount: Number(item.taxAmount),
    modifiers: parseSelectedModifiers(item.selectedModifiers),
    specialInstructions: item.specialInstructions || undefined,
    status: item.status || "PLACED",
  }));

  const timeline: OrderTimelineEntry[] = [
    {
      status: "PLACED",
      timestamp: order.createdAt.toISOString(),
      note: "Order placed by guest",
    },
  ];
  if (order.status !== "PLACED") {
    timeline.push({
      status: order.status,
      timestamp: order.updatedAt.toISOString(),
      note: `Order status: ${order.status}`,
    });
  }

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    source: order.source,
    paymentPreference: order.paymentPreference,
    customerName: order.customerName || undefined,
    customerPhone: order.customerPhone || undefined,
    specialInstructions: order.specialInstructions || undefined,
    subtotal: Number(order.subtotal),
    taxTotal: Number(order.taxTotal),
    serviceCharge: Number(order.serviceCharge),
    discountTotal: 0,
    grandTotal: Number(order.grandTotal),
    billId: order.bills[0]?.id || undefined,
    qrContext: {
      token: order.qrCode?.token || "",
      type: qrType,
      identifier,
      displayName,
      tenantId: order.tenantId,
    },
    items,
    timeline,
    cancellation:
      order.status === "CANCELLED"
        ? {
            reason: order.cancellationReason || "Cancelled by staff/guest",
            cancelledAt: order.updatedAt.toISOString(),
            cancelledBy: "STAFF",
          }
        : undefined,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
  };
}

export class OrderService {
  /**
   * Transactionally create an order from a validated QR dining context.
   * Server-authoritative pricing, automatic KOT generation, durable idempotency
   * and transactional outbox events.
   */
  async createOrder(
    payload: CreateOrderRequest,
    options: CreateOrderOptions = {}
  ): Promise<CreateOrderResponse> {
    const validatedQr = await qrService.resolveValidatedQrEntity(payload.qrToken);
    const tenantId = validatedQr.tenantId;

    const endpoint = "POST /api/v1/orders";
    let requestHash = "";
    let existingRecordId: string | undefined;

    if (options.idempotencyKey) {
      requestHash = idempotencyService.computeRequestHash(payload);
      const check = await idempotencyService.checkIdempotency(
        tenantId,
        options.idempotencyKey,
        endpoint,
        requestHash
      );

      if (check.isCached && check.cachedResponse) {
        return check.cachedResponse as CreateOrderResponse;
      }
      existingRecordId = check.existingRecordId;
    }

    const transactionResult = await withTransaction(
      async (tx) => {
        let idempotencyRecordId: string | undefined;
        if (options.idempotencyKey) {
          idempotencyRecordId = await idempotencyService.reserveKey(tx, {
            tenantId,
            key: options.idempotencyKey,
            endpoint,
            requestHash,
            existingRecordId,
          });
        }

        // Revalidate pricing and availability inside the transaction
        const cartValidation = await cartService.validateCart(
          { qrToken: payload.qrToken, items: payload.items },
          tx
        );

        const unavailable = cartValidation.unavailableItems;
        if (unavailable.length > 0) {
          throw new ConflictError(
            `One or more items in the order are unavailable: ${unavailable.map((u) => u.reason).join("; ")}`,
            ErrorCode.ITEM_UNAVAILABLE,
            { unavailableItems: unavailable }
          );
        }
        if (!cartValidation.isValid) {
          throw new BadRequestError("The order cart contains invalid items or modifier selections", ErrorCode.VALIDATION_FAILED, { warnings: cartValidation.warnings });
        }

        const orderNumber = await sequenceService.allocateOrderNumber(tenantId, tx);
        const kotNumber = await sequenceService.allocateKotNumber(tenantId, tx);

        const order = await orderModel.create(
          {
            tenantId,
            orderNumber,
            source: resolveOrderSource(options.userRole, payload.source),
            qrCodeId: validatedQr.qr.id,
            tableId: validatedQr.table?.id,
            roomId: validatedQr.room?.id,
            customerName: payload.customerName || null,
            customerPhone: payload.customerPhone || null,
            specialInstructions: payload.specialInstructions || null,
            status: OrderStatus.CONFIRMED,
            paymentPreference:
              payload.paymentPreference === "PAY_NOW"
                ? PaymentPreference.PAY_NOW
                : PaymentPreference.PAY_LATER,
            subtotal: new Prisma.Decimal(cartValidation.pricing.taxableSubtotal),
            taxTotal: new Prisma.Decimal(cartValidation.pricing.taxBreakdown.totalTax),
            serviceCharge: new Prisma.Decimal(0.0),
            grandTotal: new Prisma.Decimal(cartValidation.pricing.grandTotal),
          },
          tx
        );

        // Order items snapshot price, tax and modifiers
        const lines: CreatedLine[] = [];
        for (const lineItem of cartValidation.lineItems) {
          const orderItem = await orderModel.createItem(
            {
              orderId: order.id,
              menuItemId: lineItem.menuItemId,
              itemName: lineItem.name,
              quantity: lineItem.quantity,
              unitPrice: new Prisma.Decimal(lineItem.unitPrice),
              totalPrice: new Prisma.Decimal(lineItem.lineSubtotal),
              taxAmount: new Prisma.Decimal(lineItem.taxAmount),
              selectedModifiers: lineItem.modifiers,
              specialInstructions: lineItem.specialInstructions || null,
              status: "PLACED",
            },
            tx
          );
          lines.push({ orderItem, lineItem });
        }

        const kot = await kotModel.create(
          {
            orderId: order.id,
            kotNumber,
            status: KotStatus.NEW,
            station: "Main Kitchen",
          },
          tx
        );

        for (const { orderItem, lineItem } of lines) {
          await kotModel.createItem(
            {
              kotId: kot.id,
              orderItemId: orderItem.id,
              quantity: orderItem.quantity,
              modifiersSummary: lineItem.modifiers.map((m) => m.name).join(", ") || null,
              specialInstructions: orderItem.specialInstructions,
            },
            tx
          );
        }

        if (validatedQr.type === "TABLE" && validatedQr.table) {
          await tableModel.attachOrder(
            validatedQr.table.id,
            order.id,
            validatedQr.table.status === "VACANT",
            tx
          );
        }

        const dining = diningLabels(validatedQr);

        // Stock is deducted on order confirmation / KOT creation
        await inventoryService.deductStockForOrder(tx, tenantId, order.id, kot.id);

        const orderCreatedEvent = await outboxService.createEvent(tx, {
          tenantId,
          eventType: "order.created",
          topic: "orders:all",
          payload: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            tableOrRoom: dining.displayName,
            status: order.status,
            grandTotal: Number(order.grandTotal),
            itemCount: lines.length,
            createdAt: order.createdAt.toISOString(),
          },
        });

        const kotCreatedEvent = await outboxService.createEvent(tx, {
          tenantId,
          eventType: "kot.created",
          topic: "kitchen:kots",
          payload: {
            kotId: kot.id,
            kotNumber: kot.kotNumber,
            orderId: order.id,
            tableOrRoom: dining.displayName,
            station: kot.station,
            status: kot.status,
            itemCount: lines.length,
            createdAt: kot.createdAt.toISOString(),
          },
        });

        await queueKotPrintJob(tx, {
          tenantId,
          order,
          kot,
          qr: validatedQr,
          displayName: dining.displayName,
          lines,
        });

        const response = buildCreateOrderResponse({
          order,
          kot,
          qr: validatedQr,
          qrToken: payload.qrToken,
          dining,
          lines,
        });

        if (idempotencyRecordId) {
          await idempotencyService.completeKey(tx, idempotencyRecordId, order.id, 201, response);
        }

        return {
          response,
          outboxEventIds: [orderCreatedEvent.id, kotCreatedEvent.id],
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 25000,
        timeout: 45000,
      }
    );

    // Deliver post-commit without blocking the HTTP response
    for (const eventId of transactionResult.outboxEventIds) {
      outboxService.dispatchEvent(eventId).catch(() => {});
    }

    return transactionResult.response;
  }

  /** Retrieve a single order by ID or order number. */
  async getOrderById(orderId: string, tenantId?: string): Promise<OrderResponse> {
    const order = ensureFound(
      await orderModel.findByRefWithDetails(orderId, tenantId),
      "Order not found",
      ErrorCode.ORDER_NOT_FOUND
    );
    return formatOrderEntity(order);
  }

  /**
   * Resolve the tenant scope for order listing: staff token tenant first,
   * then a valid dining QR token. Throws 401 when neither is available.
   */
  async resolveListTenantId(staffTenantId?: string, qrToken?: string): Promise<string> {
    let tenantId = staffTenantId;

    if (!tenantId && qrToken) {
      try {
        const qr = await qrService.resolveValidatedQrEntity(qrToken.trim());
        tenantId = qr.tenantId;
      } catch {
        // Invalid QR token: fall through to the 401 below
      }
    }

    if (!tenantId) {
      throw new UnauthorizedError("Authentication or valid QR token context required");
    }

    return tenantId;
  }

  /** List paginated orders for a tenant. */
  async listOrders(tenantId: string, params?: ListOrdersParams): Promise<OrderListResponse> {
    const page = Math.max(1, params?.page || 1);
    const limit = Math.min(100, Math.max(1, params?.limit || 20));
    const skip = (page - 1) * limit;

    const { total, orders } = await orderModel.findPage(
      { tenantId, status: params?.status, qrType: params?.qrType },
      limit,
      skip
    );

    return {
      items: orders.map((o) => formatOrderEntity(o)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Update order status and publish an `order.updated` event (best effort). */
  async updateOrderStatus(
    orderId: string,
    status: OrderStatus,
    note?: string,
    tenantId?: string
  ): Promise<OrderResponse> {
    const order = ensureFound(
      await orderModel.findByRef(orderId, tenantId),
      "Order not found",
      ErrorCode.ORDER_NOT_FOUND
    );

    const updated = await orderModel.updateStatus(order.id, status, note);

    try {
      const event = await outboxService.recordEvent({
        tenantId: updated.tenantId,
        eventType: "order.updated",
        topic: "orders:all",
        payload: {
          orderId: updated.id,
          orderNumber: updated.orderNumber,
          status: updated.status,
          note,
        },
      });
      outboxService.dispatchEvent(event.id).catch(() => {});
    } catch {
      // Realtime notification is best effort; the status update has already committed
    }

    return formatOrderEntity(updated);
  }

  /** Cancel an order. */
  async cancelOrder(orderId: string, reason: string, tenantId?: string): Promise<OrderResponse> {
    return this.updateOrderStatus(orderId, OrderStatus.CANCELLED, reason, tenantId);
  }
}

export const orderService = new OrderService();
