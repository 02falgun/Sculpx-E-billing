import { KotStatus, OrderStatus, OutboxStatus, Prisma } from "@prisma/client";
import { withTransaction } from "../database/prisma.js";
import { BadRequestError, ConflictError, NotFoundError } from "../lib/errors.js";
import { ErrorCode } from "../constants/error-codes.js";
import { logger } from "../lib/logger.js";
import { kotModel } from "../models/kot.model.js";
import { orderModel } from "../models/order.model.js";
import { outboxModel } from "../models/outbox.model.js";
import { outboxService } from "./outbox.service.js";
import type {
  FormattedKOT,
  FormattedKotItem,
  KotModifier,
  KotQrContext,
  KotUrgency,
  KotWithDetails,
} from "../types/kitchen.types.js";

/**
 * Valid state transitions for the documented KOT lifecycle:
 * NEW (PENDING) -> ACCEPTED -> PREPARING -> READY -> SERVED
 */
const VALID_TRANSITIONS: Record<KotStatus, KotStatus[]> = {
  [KotStatus.NEW]: [KotStatus.ACCEPTED],
  [KotStatus.ACCEPTED]: [KotStatus.PREPARING],
  [KotStatus.PREPARING]: [KotStatus.READY],
  [KotStatus.READY]: [KotStatus.SERVED],
  [KotStatus.SERVED]: [],
  [KotStatus.CANCELLED]: [],
};

/** OrderItem preparation status mirrored from the KOT status. */
const ORDER_ITEM_STATUS_FOR_KOT: Partial<Record<KotStatus, string>> = {
  [KotStatus.PREPARING]: "PREPARING",
  [KotStatus.READY]: "READY",
  [KotStatus.SERVED]: "SERVED",
};

function kotNotFound(): NotFoundError {
  return new NotFoundError("Kitchen order ticket not found", ErrorCode.KOT_NOT_FOUND);
}

function isKotStatus(value: string): value is KotStatus {
  return (Object.values(KotStatus) as string[]).includes(value);
}

function urgencyFor(createdAt: Date): KotUrgency {
  const elapsedMinutes = (Date.now() - createdAt.getTime()) / 60000;
  if (elapsedMinutes > 20) return "URGENT";
  if (elapsedMinutes >= 15) return "HIGH";
  return "NORMAL";
}

function qrContextFor(order: KotWithDetails["order"]): KotQrContext {
  if (order.table) {
    return {
      type: "TABLE",
      identifier: order.table.tableNumber,
      displayName: order.table.displayName || `Table ${order.table.tableNumber}`,
      roomOrTableId: order.table.id,
    };
  }
  if (order.room) {
    return {
      type: "ROOM",
      identifier: order.room.roomNumber,
      displayName: `Room ${order.room.roomNumber}`,
      roomOrTableId: order.room.id,
    };
  }
  return { type: "TABLE", identifier: "Takeaway", displayName: "Counter / Takeaway" };
}

function formatKotItem(ki: KotWithDetails["items"][number]): FormattedKotItem {
  const { orderItem } = ki;
  // selectedModifiers is free-form JSON written at order time; trust its stored shape
  const modifiers = Array.isArray(orderItem.selectedModifiers)
    ? (orderItem.selectedModifiers as unknown as KotModifier[])
    : [];

  return {
    id: ki.id,
    orderItemId: ki.orderItemId,
    menuItemId: orderItem.menuItemId || "",
    name: orderItem.itemName || "Item",
    quantity: ki.quantity,
    modifiers,
    modifiersSummary: ki.modifiersSummary,
    specialInstructions: ki.specialInstructions || orderItem.specialInstructions || null,
    status: orderItem.status || "PLACED",
  };
}

/** Parent order status implied by the statuses of all its KOTs. */
function deriveOrderStatus(current: OrderStatus, kotStatuses: KotStatus[]): OrderStatus {
  if (kotStatuses.every((s) => s === KotStatus.SERVED)) {
    return OrderStatus.SERVED;
  }
  if (kotStatuses.every((s) => s === KotStatus.READY || s === KotStatus.SERVED)) {
    return OrderStatus.READY;
  }
  const anyCookingOrAbove = kotStatuses.some(
    (s) => s === KotStatus.PREPARING || s === KotStatus.READY || s === KotStatus.SERVED
  );
  if (anyCookingOrAbove && (current === OrderStatus.CONFIRMED || current === OrderStatus.PLACED)) {
    return OrderStatus.PREPARING;
  }
  return current;
}

/** Fire-and-forget dispatch after commit; WebSocket failures never invalidate the transaction. */
function dispatchAfterCommit(outboxId: string | null, failureMessage: string): void {
  if (!outboxId) return;
  outboxService.dispatchEvent(outboxId).catch((err) => {
    logger.warn({ msg: failureMessage, err });
  });
}

export class KitchenService {
  /** Format a KOT record into the API response shape. */
  public formatKot(kot: KotWithDetails): FormattedKOT {
    const readyAt = kot.readyAt ? kot.readyAt.toISOString() : null;

    return {
      id: kot.id,
      kotNumber: kot.kotNumber,
      orderId: kot.orderId,
      orderNumber: kot.order.orderNumber || "",
      status: kot.status,
      station: kot.station || "Main Kitchen",
      urgency: urgencyFor(kot.createdAt),
      specialNotes: kot.order.specialInstructions || null,
      acceptedAt: kot.acceptedAt ? kot.acceptedAt.toISOString() : null,
      readyAt,
      preparedAt: readyAt,
      servedAt: kot.servedAt ? kot.servedAt.toISOString() : null,
      createdAt: kot.createdAt.toISOString(),
      // KOTs have no updatedAt column
      updatedAt: kot.createdAt.toISOString(),
      qrContext: qrContextFor(kot.order),
      items: kot.items.map(formatKotItem),
    };
  }

  /** Active KOTs (not yet SERVED or CANCELLED) for a tenant. */
  async getActiveKots(tenantId: string, station?: string): Promise<FormattedKOT[]> {
    const kots = await kotModel.findActiveForTenant(tenantId, station);
    return kots.map((k) => this.formatKot(k));
  }

  /** A single KOT, scoped to the tenant. */
  async getKotById(tenantId: string, kotId: string): Promise<FormattedKOT> {
    const kot = await kotModel.findByIdWithDetails(kotId);

    if (!kot || kot.order.tenantId !== tenantId) {
      throw kotNotFound();
    }

    return this.formatKot(kot);
  }

  /**
   * Atomically progress KOT status, synchronize linked OrderItems & parent Order,
   * record transactional outbox events, and dispatch them after commit.
   */
  async updateKotStatus(
    tenantId: string,
    kotId: string,
    rawRequestedStatus: string,
    note?: string
  ): Promise<FormattedKOT> {
    // PENDING is accepted as an alias for NEW
    const normalizedInput = rawRequestedStatus.toUpperCase().trim();
    const requestedStatus = normalizedInput === "PENDING" ? KotStatus.NEW : normalizedInput;

    if (!isKotStatus(requestedStatus)) {
      throw new BadRequestError(`Invalid KOT status '${rawRequestedStatus}'. Permitted values: NEW, ACCEPTED, PREPARING, READY, SERVED`);
    }

    const result = await withTransaction(async (tx) => {
      // Row-lock the KOT before reading it so concurrent transitions serialize
      if (!(await kotModel.lockById(kotId, tx))) {
        throw kotNotFound();
      }

      const kot = await kotModel.findByIdWithDetails(kotId, tx);
      if (!kot || kot.order.tenantId !== tenantId) {
        throw kotNotFound();
      }

      // Repeated request: already in the requested state
      if (kot.status === requestedStatus) {
        logger.info({
          msg: "KOT status transition is idempotent replay; no state change required",
          kotId,
          status: kot.status,
        });

        return {
          kot,
          kotOutboxId: null,
          orderOutboxId: null,
          readyOutboxId: null,
          isIdempotentReplay: true,
        };
      }

      const allowedNextStatuses = VALID_TRANSITIONS[kot.status];
      if (!allowedNextStatuses.includes(requestedStatus)) {
        throw new ConflictError(`Illegal status transition: cannot transition KOT from '${kot.status}' to '${requestedStatus}'. Valid next states: [${allowedNextStatuses.join(", ")}]`, ErrorCode.INVALID_STATUS_TRANSITION, {
            currentStatus: kot.status,
            requestedStatus,
            allowedNextStatuses,
          });
      }

      // Update the KOT and stamp its lifecycle timestamp (first time only)
      const now = new Date();
      const updateData: Prisma.KotUpdateInput = {
        status: requestedStatus,
      };

      if (requestedStatus === KotStatus.ACCEPTED && !kot.acceptedAt) {
        updateData.acceptedAt = now;
      } else if (requestedStatus === KotStatus.READY && !kot.readyAt) {
        updateData.readyAt = now;
      } else if (requestedStatus === KotStatus.SERVED && !kot.servedAt) {
        updateData.servedAt = now;
      }

      const updatedKot = await kotModel.updateWithDetails(kotId, updateData, tx);

      // Mirror the status onto the linked order items
      const newOrderItemStatus = ORDER_ITEM_STATUS_FOR_KOT[requestedStatus];
      if (newOrderItemStatus) {
        const orderItemIds = kot.items.map((ki) => ki.orderItemId);
        if (orderItemIds.length > 0) {
          await orderModel.updateItemStatuses(orderItemIds, newOrderItemStatus, tx);
        }
      }

      // Recompute the parent order's status across all of its KOTs
      const allOrderKots = await kotModel.findStatusesForOrder(kot.orderId, tx);
      const allStatuses = allOrderKots.map((k) => (k.id === kotId ? requestedStatus : k.status));
      const targetOrderStatus = deriveOrderStatus(kot.order.status, allStatuses);

      let orderOutboxId: string | null = null;
      if (targetOrderStatus !== kot.order.status) {
        await orderModel.setStatus(kot.orderId, targetOrderStatus, tx);

        const orderEvent = await outboxModel.create(
          {
            tenantId,
            eventType: "order.updated",
            topic: "orders:all",
            payload: {
              orderId: kot.orderId,
              orderNumber: kot.order.orderNumber,
              status: targetOrderStatus,
              previousStatus: kot.order.status,
              timestamp: now.toISOString(),
            },
            status: OutboxStatus.PENDING,
          },
          tx
        );
        orderOutboxId = orderEvent.id;
      }

      // Food is ready for pickup: notify front-of-house
      let readyOutboxId: string | null = null;
      if (requestedStatus === KotStatus.READY) {
        const readyEvent = await outboxModel.create(
          {
            tenantId,
            eventType: "kot.ready",
            topic: "orders:all",
            payload: {
              kotId: updatedKot.id,
              kotNumber: updatedKot.kotNumber,
              orderId: updatedKot.orderId,
              orderNumber: updatedKot.order.orderNumber,
              station: updatedKot.station,
              tableName: updatedKot.order.table?.displayName || updatedKot.order.table?.tableNumber || null,
              roomNumber: updatedKot.order.room?.roomNumber || null,
              timestamp: now.toISOString(),
            },
            status: OutboxStatus.PENDING,
          },
          tx
        );
        readyOutboxId = readyEvent.id;
      }

      const kotEvent = await outboxModel.create(
        {
          tenantId,
          eventType: "kot.status_updated",
          topic: "kitchen:kots",
          payload: {
            kotId: updatedKot.id,
            kotNumber: updatedKot.kotNumber,
            orderId: updatedKot.orderId,
            orderNumber: updatedKot.order.orderNumber,
            status: requestedStatus,
            previousStatus: kot.status,
            acceptedAt: updatedKot.acceptedAt?.toISOString() || null,
            readyAt: updatedKot.readyAt?.toISOString() || null,
            servedAt: updatedKot.servedAt?.toISOString() || null,
            updatedAt: now.toISOString(),
            station: updatedKot.station,
            note: note || null,
          },
          status: OutboxStatus.PENDING,
        },
        tx
      );

      return {
        kot: updatedKot,
        kotOutboxId: kotEvent.id,
        orderOutboxId,
        readyOutboxId,
        isIdempotentReplay: false,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      timeout: 20000,
    });

    dispatchAfterCommit(result.kotOutboxId, "Post-commit dispatch of KOT outbox event failed");
    dispatchAfterCommit(result.orderOutboxId, "Post-commit dispatch of Order outbox event failed");
    dispatchAfterCommit(result.readyOutboxId, "Post-commit dispatch of KOT Ready outbox event failed");

    return this.formatKot(result.kot);
  }
}

export const kitchenService = new KitchenService();
