import type { BillPaymentStatus, Prisma } from "@prisma/client";
import { prisma, type DbClient } from "../database/prisma.js";

export const billDetailsInclude = {
  items: true,
  payments: true,
  order: { include: { table: true, room: true, qrCode: true } },
} satisfies Prisma.BillInclude;

export const billPaymentInclude = {
  payments: true,
  order: { include: { table: true, room: true } },
} satisfies Prisma.BillInclude;

export const billModel = {
  /** Row-lock the order (SELECT ... FOR UPDATE). Call inside a transaction. */
  lockOrderForUpdate(orderId: string, tenantId: string, db: DbClient = prisma) {
    return db.$queryRaw`
      SELECT id, status, tenant_id FROM orders
      WHERE id = ${orderId}::uuid AND tenant_id = ${tenantId}::uuid
      FOR UPDATE
    `;
  },

  /** Row-lock the bill (SELECT ... FOR UPDATE). Call inside a transaction. */
  lockForUpdate(billId: string, tenantId: string, db: DbClient = prisma) {
    return db.$queryRaw`
      SELECT id, payment_status, subtotal, grand_total, tenant_id FROM bills
      WHERE id = ${billId}::uuid AND tenant_id = ${tenantId}::uuid
      FOR UPDATE
    `;
  },

  /** Order with items, its bills (with details), table, room and QR code. */
  findOrderForBilling(orderId: string, tenantId: string, db: DbClient = prisma) {
    return db.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        items: true,
        bills: { include: billDetailsInclude },
        table: true,
        room: true,
        qrCode: true,
      },
    });
  },

  findOrderWithBills(orderId: string, db: DbClient = prisma) {
    return db.order.findUnique({
      where: { id: orderId },
      include: { bills: { include: billDetailsInclude } },
    });
  },

  findTenantId(billId: string, db: DbClient = prisma) {
    return db.bill.findUnique({ where: { id: billId }, select: { tenantId: true } });
  },

  findByIdWithDetails(billId: string, db: DbClient = prisma) {
    return db.bill.findUnique({ where: { id: billId }, include: billDetailsInclude });
  },

  findByOrderWithDetails(orderId: string, tenantId: string, db: DbClient = prisma) {
    return db.bill.findFirst({ where: { orderId, tenantId }, include: billDetailsInclude });
  },

  findLatestByOrder(orderId: string, tenantId?: string, db: DbClient = prisma) {
    return db.bill.findFirst({
      where: {
        orderId,
        ...(tenantId ? { tenantId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: billDetailsInclude,
    });
  },

  findByIdForPayment(billId: string, db: DbClient = prisma) {
    return db.bill.findUnique({ where: { id: billId }, include: billPaymentInclude });
  },

  findByOrderForPayment(orderId: string, tenantId: string, db: DbClient = prisma) {
    return db.bill.findFirst({ where: { orderId, tenantId }, include: billPaymentInclude });
  },

  async findPage(
    tenantId: string,
    paymentStatus: BillPaymentStatus | undefined,
    take: number,
    skip: number,
    db: DbClient = prisma
  ) {
    const where: Prisma.BillWhereInput = {
      tenantId,
      ...(paymentStatus ? { paymentStatus } : {}),
    };
    const [bills, total] = await Promise.all([
      db.bill.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        include: billDetailsInclude,
      }),
      db.bill.count({ where }),
    ]);
    return { bills, total };
  },

  create(data: Prisma.BillUncheckedCreateInput, db: DbClient = prisma) {
    return db.bill.create({ data });
  },

  createItem(data: Prisma.BillItemUncheckedCreateInput, db: DbClient = prisma) {
    return db.billItem.create({ data });
  },

  update(billId: string, data: Prisma.BillUncheckedUpdateInput, db: DbClient = prisma) {
    return db.bill.update({ where: { id: billId }, data });
  },

  updateWithDetails(billId: string, data: Prisma.BillUncheckedUpdateInput, db: DbClient = prisma) {
    return db.bill.update({ where: { id: billId }, data, include: billDetailsInclude });
  },

  createPayment(data: Prisma.PaymentUncheckedCreateInput, db: DbClient = prisma) {
    return db.payment.create({ data });
  },

  /** Payments received by the user (historical references that block hard deletion). */
  countPaymentsReceivedBy(userId: string, db: DbClient = prisma) {
    return db.payment.count({ where: { receivedByUserId: userId } });
  },
};
