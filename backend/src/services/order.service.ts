import { Prisma, OrderStatus, OrderSource, PaymentPreference, KotStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { qrService } from "./qr.service.js";
import { cartService } from "./cart.service.js";
import { sequenceService } from "./sequence.service.js";
import { idempotencyService } from "./idempotency.service.js";
import { outboxService } from "./outbox.service.js";
import { inventoryService } from "./inventory.service.js";
import { logger } from "../lib/logger.js";
import { AppError } from "../lib/errors.js";
import type {
  CreateOrderRequest,
  CreateOrderResponse,
  CreatedOrderItemResponse,
} from "../schemas/order.schema.js";

export class OrderService {
  /**
   * Transactionally create an order from a validated QR dining context.
   * Enforces server-authoritative pricing, automatic KOT generation,
   * durable idempotency, and transactional outbox event queuing.
   */
  async createOrder(
    payload: CreateOrderRequest,
    options: {
      idempotencyKey?: string;
      userRole?: string;
    } = {}
  ): Promise<CreateOrderResponse> {
    // 1. Resolve and verify QR context and tenant scope
    const validatedQr = await qrService.resolveValidatedQrEntity(payload.qrToken);
    const tenantId = validatedQr.tenantId;

    const endpoint = "POST /api/v1/orders";
    let requestHash = "";
    let existingRecordId: string | undefined;

    // 2. Pre-check idempotency if key was provided in headers
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

    // 3. Execute atomic PostgreSQL transaction
    const transactionResult = await prisma.$transaction(
      async (tx) => {
        // A. Reserve idempotency record inside transaction snapshot
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

        // B. Revalidate cart authoritative pricing and stock within transaction
        const cartValidation = await cartService.validateCart(
          {
            qrToken: payload.qrToken,
            items: payload.items,
          },
          tx
        );

        if (!cartValidation.isValid || cartValidation.unavailableItems.length > 0) {
          const unavailable = cartValidation.unavailableItems;
          if (unavailable.length > 0) {
            throw new AppError(
              `One or more items in the order are unavailable: ${unavailable
                .map((u) => u.reason)
                .join("; ")}`,
              409,
              "ITEM_UNAVAILABLE",
              { unavailableItems: unavailable }
            );
          }

          throw new AppError(
            "The order cart contains invalid items or modifier selections",
            400,
            "VALIDATION_FAILED",
            { warnings: cartValidation.warnings }
          );
        }

        // C. Concurrency-safe atomic allocation of human-readable numbers
        const orderNumber = await sequenceService.allocateOrderNumber(tenantId, tx);
        const kotNumber = await sequenceService.allocateKotNumber(tenantId, tx);

        // D. Determine order source and payment preference
        const isStaff =
          options.userRole &&
          ["WAITER", "CAPTAIN", "MANAGER", "ADMIN", "SUPER_ADMIN"].includes(
            options.userRole
          );
        const orderSource: OrderSource = isStaff
          ? (payload.source as OrderSource) || OrderSource.STAFF_POS
          : OrderSource.CUSTOMER_QR;

        const paymentPref: PaymentPreference =
          payload.paymentPreference === "PAY_NOW"
            ? PaymentPreference.PAY_NOW
            : PaymentPreference.PAY_LATER;

        // E. Persist Order record
        const order = await tx.order.create({
          data: {
            tenantId,
            orderNumber,
            source: orderSource,
            qrCodeId: validatedQr.qr.id,
            tableId: validatedQr.table?.id,
            roomId: validatedQr.room?.id,
            customerName: payload.customerName || null,
            customerPhone: payload.customerPhone || null,
            specialInstructions: payload.specialInstructions || null,
            status: OrderStatus.CONFIRMED,
            paymentPreference: paymentPref,
            subtotal: new Prisma.Decimal(cartValidation.pricing.taxableSubtotal),
            taxTotal: new Prisma.Decimal(cartValidation.pricing.taxBreakdown.totalTax),
            serviceCharge: new Prisma.Decimal(0.0),
            grandTotal: new Prisma.Decimal(cartValidation.pricing.grandTotal),
          },
        });

        // F. Persist OrderItems with snapshots of price, tax, and modifiers
        const createdOrderItems = [];
        for (const lineItem of cartValidation.lineItems) {
          const orderItem = await tx.orderItem.create({
            data: {
              orderId: order.id,
              menuItemId: lineItem.menuItemId,
              itemName: lineItem.name,
              quantity: lineItem.quantity,
              unitPrice: new Prisma.Decimal(lineItem.unitPrice),
              totalPrice: new Prisma.Decimal(lineItem.lineSubtotal),
              taxAmount: new Prisma.Decimal(lineItem.taxAmount),
              selectedModifiers: lineItem.modifiers as any,
              specialInstructions: lineItem.specialInstructions || null,
              status: "PLACED",
            },
          });
          createdOrderItems.push({ orderItem, lineItem });
        }

        // G. Persist initial KOT record
        const kot = await tx.kot.create({
          data: {
            orderId: order.id,
            kotNumber,
            status: KotStatus.NEW,
            station: "Main Kitchen",
          },
        });

        // H. Persist KotItems linking to OrderItems
        for (const { orderItem, lineItem } of createdOrderItems) {
          const modifiersSummary =
            lineItem.modifiers.map((m) => m.name).join(", ") || null;

          await tx.kotItem.create({
            data: {
              kotId: kot.id,
              orderItemId: orderItem.id,
              quantity: orderItem.quantity,
              modifiersSummary,
              specialInstructions: orderItem.specialInstructions,
            },
          });
        }

        // I. Update Table Session if table order
        if (validatedQr.type === "TABLE" && validatedQr.table) {
          await tx.table.update({
            where: { id: validatedQr.table.id },
            data: {
              currentOrderId: order.id,
              status:
                validatedQr.table.status === "VACANT"
                  ? "OCCUPIED"
                  : undefined,
            },
          });
        }

        const diningIdentifier =
          validatedQr.type === "TABLE"
            ? validatedQr.table!.tableNumber
            : validatedQr.room!.roomNumber;
        const diningDisplayName =
          validatedQr.type === "TABLE"
            ? validatedQr.table!.displayName || `Table ${validatedQr.table!.tableNumber}`
            : `Room ${validatedQr.room!.roomNumber}`;

        // J. Automatic Inventory Consumption (Decision 3: Deduct on Order Confirmation / KOT Creation)
        await inventoryService.deductStockForOrder(tx, tenantId, order.id, kot.id);

        // K. Transactional Outbox Events
        const orderCreatedEvent = await outboxService.createEvent(tx, {
          tenantId,
          eventType: "order.created",
          topic: "orders:all",
          payload: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            tableOrRoom: diningDisplayName,
            status: order.status,
            grandTotal: Number(order.grandTotal),
            itemCount: createdOrderItems.length,
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
            tableOrRoom: diningDisplayName,
            station: kot.station,
            status: kot.status,
            itemCount: createdOrderItems.length,
            createdAt: kot.createdAt.toISOString(),
          },
        });

        // L. Persist KOT Hardware Print Intent (Phase 6)
        try {
          const kitchenPrinter = await tx.printer.findFirst({
            where: {
              tenantId,
              isActive: true,
              OR: [
                { station: kot.station },
                { type: "KITCHEN" },
              ],
            },
            orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
          });

          if (kitchenPrinter) {
            await tx.printJob.create({
              data: {
                tenantId,
                printerId: kitchenPrinter.id,
                jobType: "KOT",
                referenceId: kot.id,
                payload: {
                  kotNumber: kot.kotNumber,
                  orderNumber: order.orderNumber,
                  station: kot.station,
                  tableOrRoom: diningDisplayName,
                  serverName: validatedQr.type === "TABLE" ? "Customer QR" : "Room QR",
                  createdAt: kot.createdAt.toISOString(),
                  items: createdOrderItems.map(({ orderItem, lineItem }) => ({
                    name: orderItem.itemName,
                    quantity: orderItem.quantity,
                    modifiers: lineItem.modifiers?.map((m: any) => typeof m === "string" ? m : m.name) || [],
                    specialInstructions: orderItem.specialInstructions,
                  })),
                  notes: validatedQr.type === "TABLE" ? "Customer QR Order" : "Room QR Order",
                },
                status: "QUEUED",
                idempotencyKey: `kot-print-${kot.id}`,
                initiatedBy: "Order Confirmation (Auto-KOT)",
              },
            });
          }
        } catch (printErr) {
          // A print queue setup issue must NEVER abort order commitment
          logger.warn({ msg: "Could not auto-queue KOT print job", err: printErr });
        }

        // M. Format final API response structure
        const formattedItems: CreatedOrderItemResponse[] = createdOrderItems.map(
          ({ orderItem, lineItem }) => ({
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
          })
        );

        const formattedResponse: CreateOrderResponse = {
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
            type: validatedQr.type,
            identifier: diningIdentifier,
            displayName: diningDisplayName,
            roomOrTableId:
              validatedQr.type === "TABLE"
                ? validatedQr.table!.id
                : validatedQr.room!.id,
          },
          items: formattedItems,
          assignedKotIds: [kot.id],
          kots: [
            {
              id: kot.id,
              kotNumber: kot.kotNumber,
              status: kot.status,
              station: kot.station,
              itemCount: createdOrderItems.length,
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
            items: formattedItems,
            createdAt: order.createdAt.toISOString(),
          },
        };

        // L. Finalize Idempotency Record
        if (idempotencyRecordId) {
          await idempotencyService.completeKey(
            tx,
            idempotencyRecordId,
            order.id,
            201,
            formattedResponse
          );
        }

        return {
          response: formattedResponse,
          outboxEventIds: [orderCreatedEvent.id, kotCreatedEvent.id],
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 20000,
      }
    );

    // 4. Asynchronously deliver outbox events (non-blocking for HTTP response)
    for (const eventId of transactionResult.outboxEventIds) {
      outboxService.dispatchEvent(eventId).catch(() => {});
    }

    return transactionResult.response;
  }
}

export const orderService = new OrderService();
