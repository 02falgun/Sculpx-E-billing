import { KotStatus, OrderStatus, OutboxStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";
import { logger } from "../lib/logger.js";
import { outboxService } from "./outbox.service.js";

export interface FormattedKotItem {
  id: string;
  orderItemId: string;
  menuItemId: string;
  name: string;
  quantity: number;
  modifiers: Array<{ name: string; price?: number }>;
  modifiersSummary?: string | null;
  specialInstructions?: string | null;
  status: string;
}

export interface FormattedKOT {
  id: string;
  kotNumber: string;
  orderId: string;
  orderNumber: string;
  status: KotStatus;
  station: string;
  urgency: "NORMAL" | "HIGH" | "URGENT";
  specialNotes?: string | null;
  acceptedAt?: string | null;
  readyAt?: string | null;
  preparedAt?: string | null;
  servedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  qrContext: {
    type: "TABLE" | "ROOM";
    identifier: string;
    displayName: string;
    roomOrTableId?: string;
  };
  items: FormattedKotItem[];
}

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

export class KitchenService {
  /**
   * Helper to format Prisma KOT records into consistent API responses.
   */
  public formatKot(kot: any): FormattedKOT {
    const elapsedMinutes = (Date.now() - new Date(kot.createdAt).getTime()) / 60000;
    const urgency = elapsedMinutes > 20 ? "URGENT" : elapsedMinutes >= 15 ? "HIGH" : "NORMAL";

    let qrContext: FormattedKOT["qrContext"] = {
      type: "TABLE",
      identifier: "Takeaway",
      displayName: "Counter / Takeaway",
    };

    if (kot.order?.table) {
      qrContext = {
        type: "TABLE",
        identifier: kot.order.table.tableNumber,
        displayName: kot.order.table.displayName || `Table ${kot.order.table.tableNumber}`,
        roomOrTableId: kot.order.table.id,
      };
    } else if (kot.order?.room) {
      qrContext = {
        type: "ROOM",
        identifier: kot.order.room.roomNumber,
        displayName: `Room ${kot.order.room.roomNumber}`,
        roomOrTableId: kot.order.room.id,
      };
    }

    const items: FormattedKotItem[] = (kot.items || []).map((ki: any) => {
      let modifiers: Array<{ name: string; price?: number }> = [];
      if (Array.isArray(ki.orderItem?.selectedModifiers)) {
        modifiers = ki.orderItem.selectedModifiers;
      }

      return {
        id: ki.id,
        orderItemId: ki.orderItemId,
        menuItemId: ki.orderItem?.menuItemId || "",
        name: ki.orderItem?.itemName || "Item",
        quantity: ki.quantity,
        modifiers,
        modifiersSummary: ki.modifiersSummary,
        specialInstructions: ki.specialInstructions || ki.orderItem?.specialInstructions || null,
        status: ki.orderItem?.status || "PLACED",
      };
    });

    return {
      id: kot.id,
      kotNumber: kot.kotNumber,
      orderId: kot.orderId,
      orderNumber: kot.order?.orderNumber || "",
      status: kot.status,
      station: kot.station || "Main Kitchen",
      urgency,
      specialNotes: kot.order?.specialInstructions || null,
      acceptedAt: kot.acceptedAt ? new Date(kot.acceptedAt).toISOString() : null,
      readyAt: kot.readyAt ? new Date(kot.readyAt).toISOString() : null,
      preparedAt: kot.readyAt ? new Date(kot.readyAt).toISOString() : null,
      servedAt: kot.servedAt ? new Date(kot.servedAt).toISOString() : null,
      createdAt: new Date(kot.createdAt).toISOString(),
      updatedAt: new Date(kot.updatedAt || kot.createdAt).toISOString(),
      qrContext,
      items,
    };
  }

  /**
   * Retrieve active KOTs for a specific tenant.
   * Returns tickets not yet SERVED or CANCELLED.
   */
  async getActiveKots(tenantId: string, station?: string): Promise<FormattedKOT[]> {
    const kots = await prisma.kot.findMany({
      where: {
        order: { tenantId },
        status: {
          notIn: [KotStatus.SERVED, KotStatus.CANCELLED],
        },
        ...(station ? { station } : {}),
      },
      include: {
        order: {
          include: {
            table: true,
            room: true,
          },
        },
        items: {
          include: {
            orderItem: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return kots.map((k) => this.formatKot(k));
  }

  /**
   * Retrieve a single KOT by ID scoped to the authenticated tenant.
   */
  async getKotById(tenantId: string, kotId: string): Promise<FormattedKOT> {
    const kot = await prisma.kot.findUnique({
      where: { id: kotId },
      include: {
        order: {
          include: {
            table: true,
            room: true,
          },
        },
        items: {
          include: {
            orderItem: true,
          },
        },
      },
    });

    if (!kot || kot.order.tenantId !== tenantId) {
      throw new AppError("Kitchen order ticket not found", 404, "KOT_NOT_FOUND");
    }

    return this.formatKot(kot);
  }

  /**
   * Atomically progress KOT status, synchronize linked OrderItems & parent Order,
   * record transactional outbox events, and guarantee post-commit event dispatching.
   */
  async updateKotStatus(
    tenantId: string,
    kotId: string,
    rawRequestedStatus: string,
    note?: string
  ): Promise<FormattedKOT> {
    // Normalize PENDING -> NEW
    const normalizedInput = rawRequestedStatus.toUpperCase().trim();
    const requestedStatus =
      normalizedInput === "PENDING"
        ? KotStatus.NEW
        : (normalizedInput as KotStatus);

    if (!Object.values(KotStatus).includes(requestedStatus)) {
      throw new AppError(
        `Invalid KOT status '${rawRequestedStatus}'. Permitted values: NEW, ACCEPTED, PREPARING, READY, SERVED`,
        400,
        "VALIDATION_FAILED"
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Concurrency-safe row locking: lock the target KOT record
      const [lockedKot] = await tx.$queryRaw<Array<{ id: string; status: KotStatus }>>`
        SELECT id, status FROM kots WHERE id = ${kotId}::uuid FOR UPDATE
      `;

      if (!lockedKot) {
        throw new AppError("Kitchen order ticket not found", 404, "KOT_NOT_FOUND");
      }

      // 2. Load full KOT entity with Order and OrderItems within the transaction
      const kot = await tx.kot.findUnique({
        where: { id: kotId },
        include: {
          order: {
            include: {
              table: true,
              room: true,
            },
          },
          items: {
            include: {
              orderItem: true,
            },
          },
        },
      });

      if (!kot) {
        throw new AppError("Kitchen order ticket not found", 404, "KOT_NOT_FOUND");
      }

      // 3. Strict multi-tenant isolation guard
      if (kot.order.tenantId !== tenantId) {
        throw new AppError("Kitchen order ticket not found", 404, "KOT_NOT_FOUND");
      }

      // 4. Repeated request tolerance: if ticket is already in the requested state, return safely
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

      // 5. Enforce valid state transitions
      const allowedNextStatuses = VALID_TRANSITIONS[kot.status] || [];
      if (!allowedNextStatuses.includes(requestedStatus)) {
        throw new AppError(
          `Illegal status transition: cannot transition KOT from '${kot.status}' to '${requestedStatus}'. Valid next states: [${allowedNextStatuses.join(", ")}]`,
          409,
          "INVALID_STATUS_TRANSITION",
          {
            currentStatus: kot.status,
            requestedStatus,
            allowedNextStatuses,
          }
        );
      }

      // 6. Update KOT record and relevant timestamps
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

      const updatedKot = await tx.kot.update({
        where: { id: kotId },
        data: updateData,
        include: {
          order: {
            include: {
              table: true,
              room: true,
            },
          },
          items: {
            include: {
              orderItem: true,
            },
          },
        },
      });

      // 7. Update linked OrderItem preparation status
      const orderItemStatusMap: Partial<Record<KotStatus, string>> = {
        [KotStatus.PREPARING]: "PREPARING",
        [KotStatus.READY]: "READY",
        [KotStatus.SERVED]: "SERVED",
      };

      const newOrderItemStatus = orderItemStatusMap[requestedStatus];
      if (newOrderItemStatus) {
        const orderItemIds = kot.items.map((ki) => ki.orderItemId);
        if (orderItemIds.length > 0) {
          await tx.orderItem.updateMany({
            where: { id: { in: orderItemIds } },
            data: { status: newOrderItemStatus },
          });
        }
      }

      // 8. Calculate parent Order progress across all associated KOTs
      const allOrderKots = await tx.kot.findMany({
        where: { orderId: kot.orderId },
        select: { id: true, status: true },
      });

      const allStatuses = allOrderKots.map((k) =>
        k.id === kotId ? requestedStatus : k.status
      );

      let targetOrderStatus: OrderStatus = kot.order.status;

      const allServed = allStatuses.every((s) => s === KotStatus.SERVED);
      const allReadyOrServed = allStatuses.every(
        (s) => s === KotStatus.READY || s === KotStatus.SERVED
      );
      const anyCookingOrAbove = allStatuses.some(
        (s) => s === KotStatus.PREPARING || s === KotStatus.READY || s === KotStatus.SERVED
      );

      if (allServed) {
        targetOrderStatus = OrderStatus.SERVED;
      } else if (allReadyOrServed) {
        targetOrderStatus = OrderStatus.READY;
      } else if (
        anyCookingOrAbove &&
        (kot.order.status === OrderStatus.CONFIRMED || kot.order.status === OrderStatus.PLACED)
      ) {
        targetOrderStatus = OrderStatus.PREPARING;
      }

      let orderOutboxId: string | null = null;
      if (targetOrderStatus !== kot.order.status) {
        await tx.order.update({
          where: { id: kot.orderId },
          data: { status: targetOrderStatus },
        });

        const orderEvent = await tx.outboxEvent.create({
          data: {
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
        });
        orderOutboxId = orderEvent.id;
      }

      // 9. Emit dedicated kot.ready notification on orders:all if food is ready to pick up
      let readyOutboxId: string | null = null;
      if (requestedStatus === KotStatus.READY) {
        const readyEvent = await tx.outboxEvent.create({
          data: {
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
        });
        readyOutboxId = readyEvent.id;
      }

      // 10. Record primary kot.status_updated outbox event
      const kotEvent = await tx.outboxEvent.create({
        data: {
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
      });

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

    // 11. Post-commit event dispatching: WebSocket failures never invalidate the transaction
    if (result.kotOutboxId) {
      outboxService.dispatchEvent(result.kotOutboxId).catch((err) => {
        logger.warn({ msg: "Post-commit dispatch of KOT outbox event failed", err });
      });
    }

    if (result.orderOutboxId) {
      outboxService.dispatchEvent(result.orderOutboxId).catch((err) => {
        logger.warn({ msg: "Post-commit dispatch of Order outbox event failed", err });
      });
    }

    if (result.readyOutboxId) {
      outboxService.dispatchEvent(result.readyOutboxId).catch((err) => {
        logger.warn({ msg: "Post-commit dispatch of KOT Ready outbox event failed", err });
      });
    }

    return this.formatKot(result.kot);
  }
}

export const kitchenService = new KitchenService();
