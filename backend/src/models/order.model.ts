import { OrderStatus, type Prisma } from "@prisma/client";
import { prisma, type DbClient } from "../database/prisma.js";
import type { OrderListFilter } from "../types/order.types.js";

const ACTIVE_ORDER_STATUSES = [
  OrderStatus.PLACED,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.SERVED,
];

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const orderDetailsInclude = {
  qrCode: true,
  table: true,
  room: true,
  items: true,
  kots: true,
  bills: { select: { id: true, billNumber: true, paymentStatus: true } },
} satisfies Prisma.OrderInclude;

/** Match an order by UUID or human-readable order number, optionally tenant-scoped. */
function refWhere(orderRef: string, tenantId?: string): Prisma.OrderWhereInput {
  return {
    ...(UUID_PATTERN.test(orderRef) ? { id: orderRef } : { orderNumber: orderRef }),
    ...(tenantId ? { tenantId } : {}),
  };
}

function listWhere(filter: OrderListFilter): Prisma.OrderWhereInput {
  const where: Prisma.OrderWhereInput = { tenantId: filter.tenantId };
  if (filter.status) {
    where.status = filter.status as OrderStatus;
  }
  if (filter.qrType === "TABLE") {
    where.tableId = { not: null };
  } else if (filter.qrType === "ROOM") {
    where.roomId = { not: null };
  }
  return where;
}

export const orderModel = {
  create(data: Prisma.OrderUncheckedCreateInput, db: DbClient = prisma) {
    return db.order.create({ data });
  },

  createItem(data: Prisma.OrderItemUncheckedCreateInput, db: DbClient = prisma) {
    return db.orderItem.create({ data });
  },

  findByRef(orderRef: string, tenantId?: string, db: DbClient = prisma) {
    return db.order.findFirst({ where: refWhere(orderRef, tenantId) });
  },

  findByRefWithDetails(orderRef: string, tenantId?: string, db: DbClient = prisma) {
    return db.order.findFirst({ where: refWhere(orderRef, tenantId), include: orderDetailsInclude });
  },

  async findPage(filter: OrderListFilter, take: number, skip: number, db: DbClient = prisma) {
    const where = listWhere(filter);
    const [total, orders] = await Promise.all([
      db.order.count({ where }),
      db.order.findMany({
        where,
        include: orderDetailsInclude,
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
    ]);
    return { total, orders };
  },

  updateStatus(id: string, status: OrderStatus, cancellationReason?: string, db: DbClient = prisma) {
    return db.order.update({
      where: { id },
      data: {
        status,
        ...(status === "CANCELLED" && cancellationReason ? { cancellationReason } : {}),
      },
      include: orderDetailsInclude,
    });
  },

  /** Status-only update (no details include). */
  setStatus(id: string, status: Prisma.OrderUpdateInput["status"], db: DbClient = prisma) {
    return db.order.update({ where: { id }, data: { status } });
  },

  complete(id: string, db: DbClient = prisma) {
    return db.order.update({ where: { id }, data: { status: OrderStatus.COMPLETED } });
  },

  /** Active orders on the table other than `excludeOrderId`. */
  countOtherActiveForTable(tableId: string, excludeOrderId: string, db: DbClient = prisma) {
    return db.order.count({
      where: {
        tableId,
        status: { in: ACTIVE_ORDER_STATUSES },
        id: { not: excludeOrderId },
      },
    });
  },

  findItems(orderId: string, db: DbClient = prisma) {
    return db.orderItem.findMany({ where: { orderId } });
  },

  updateItemStatuses(orderItemIds: string[], status: string, db: DbClient = prisma) {
    return db.orderItem.updateMany({
      where: { id: { in: orderItemIds } },
      data: { status },
    });
  },
};
