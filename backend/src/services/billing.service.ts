import {
  Prisma,
  type PrismaClient,
  BillPaymentStatus,
  PaymentMethod,
  PaymentRecordStatus,
  TableStatus,
  OrderStatus,
} from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { sequenceService } from "./sequence.service.js";
import { idempotencyService } from "./idempotency.service.js";
import { outboxService } from "./outbox.service.js";
import { AppError } from "../lib/errors.js";
import type {
  ApplyDiscountBody,
  RecordPaymentBody,
} from "../schemas/billing.schema.js";

export interface FormattedBillResponse {
  id: string;
  billNumber: string;
  orderId: string;
  orderNumber: string;
  qrContext: {
    type: "TABLE" | "ROOM";
    identifier: string;
    displayName: string;
    token: string;
  };
  status: "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "VOIDED";
  paymentStatus: "UNPAID" | "PARTIALLY_PAID" | "PAID" | "VOIDED";
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  discounts: Array<{
    code?: string;
    type: "PERCENTAGE" | "FLAT";
    value: number;
    amount: number;
    authorizedBy?: string;
  }>;
  totalDiscount: number;
  taxes: Array<{
    name: string;
    ratePercentage: number;
    amount: number;
  }>;
  totalTax: number;
  serviceCharge: number;
  roundOff: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  payments: Array<{
    id: string;
    billId: string;
    orderId: string;
    amount: number;
    method: string;
    status: string;
    transactionReference?: string | null;
    notes?: string | null;
    createdAt: string;
  }>;
  voidedReason?: string;
  settledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class BillingService {
  /**
   * Helper to format a Prisma Bill into a consistent API response.
   */
  formatBill(bill: any): FormattedBillResponse {
    const order = bill.order || {};
    const table = order.table;
    const room = order.room;
    const qrCode = order.qrCode;

    const qrType: "TABLE" | "ROOM" = room ? "ROOM" : "TABLE";
    const identifier = room
      ? room.roomNumber
      : table?.tableNumber || "01";
    const displayName = room
      ? `Room ${room.roomNumber}`
      : table?.displayName || `Table ${table?.tableNumber || "01"}`;

    const items = (bill.items || []).map((it: any) => ({
      id: it.id,
      name: it.itemName,
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice.toFixed(2)),
      totalPrice: Number(it.totalPrice.toFixed(2)),
    }));

    const taxDetails =
      typeof bill.taxDetails === "object" && bill.taxDetails !== null
        ? (bill.taxDetails as Record<string, any>)
        : {};

    const taxes = Array.isArray(taxDetails.taxes) ? taxDetails.taxes : [];
    const discounts = Array.isArray(taxDetails.discounts)
      ? taxDetails.discounts
      : [];

    const successfulPayments = (bill.payments || []).filter(
      (p: any) => p.status === PaymentRecordStatus.SUCCESS
    );

    const paidAmount = successfulPayments.reduce(
      (sum: number, p: any) => sum + Number(p.amount),
      0
    );

    const grandTotal = Number(bill.grandTotal.toFixed(2));
    const dueAmount = Math.max(0, Number((grandTotal - paidAmount).toFixed(2)));

    // Map database enum to frontend status representation
    let status: "DRAFT" | "ISSUED" | "PARTIALLY_PAID" | "PAID" | "VOIDED";
    if (bill.paymentStatus === BillPaymentStatus.VOIDED) {
      status = "VOIDED";
    } else if (bill.paymentStatus === BillPaymentStatus.PAID || dueAmount === 0) {
      status = "PAID";
    } else if (
      bill.paymentStatus === BillPaymentStatus.PARTIALLY_PAID ||
      paidAmount > 0
    ) {
      status = "PARTIALLY_PAID";
    } else {
      status = "ISSUED";
    }

    const formattedPayments = (bill.payments || []).map((p: any) => ({
      id: p.id,
      billId: p.billId,
      orderId: bill.orderId,
      amount: Number(p.amount.toFixed(2)),
      method: p.paymentMethod === "ROOM_FOLIO" ? "ROOM_CHARGE" : p.paymentMethod,
      status: p.status,
      transactionReference: p.transactionReference,
      notes: p.notes,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
    }));

    return {
      id: bill.id,
      billNumber: bill.billNumber,
      orderId: bill.orderId,
      orderNumber: order.orderNumber || "",
      qrContext: {
        type: qrType,
        identifier,
        displayName,
        token: qrCode?.token || "",
      },
      status,
      paymentStatus: bill.paymentStatus,
      items,
      subtotal: Number(bill.subtotal.toFixed(2)),
      discounts,
      totalDiscount: Number(bill.discountAmount.toFixed(2)),
      taxes,
      totalTax: Number(
        (taxDetails.totalTax ??
          taxes.reduce((acc: number, t: any) => acc + (t.amount || 0), 0)
        ).toFixed(2)
      ),
      serviceCharge: Number(bill.serviceCharge.toFixed(2)),
      roundOff: Number(bill.roundingDifference.toFixed(2)),
      grandTotal,
      paidAmount: Number(paidAmount.toFixed(2)),
      dueAmount,
      payments: formattedPayments,
      voidedReason: taxDetails.voidedReason,
      settledAt: taxDetails.settledAt,
      createdAt:
        bill.createdAt instanceof Date
          ? bill.createdAt.toISOString()
          : bill.createdAt,
      updatedAt:
        bill.updatedAt instanceof Date
          ? bill.updatedAt.toISOString()
          : bill.updatedAt,
    };
  }

  /**
   * Transactionally generate tax invoice for a dining order.
   * Enforces server-authoritative pricing snapshots, atomic sequential numbering,
   * duplicate prevention, and transactional outbox events.
   */
  async generateBillForOrder(
    orderId: string,
    tenantId: string,
    _userId?: string
  ): Promise<FormattedBillResponse> {
    // 1. Check order existence and tenant scoping
    const existingOrder = await prisma.order.findFirst({
      where: {
        id: orderId,
        tenantId,
      },
      include: {
        items: true,
        bills: {
          include: {
            items: true,
            payments: true,
            order: {
              include: {
                table: true,
                room: true,
                qrCode: true,
              },
            },
          },
        },
        table: true,
        room: true,
        qrCode: true,
      },
    });

    if (!existingOrder) {
      throw new AppError("Order not found", 404, "ORDER_NOT_FOUND", { orderId });
    }

    // 2. Validate order billing eligibility
    if (existingOrder.status === OrderStatus.CANCELLED) {
      throw new AppError(
        "Cannot generate bill for a cancelled order",
        400,
        "ORDER_NOT_ELIGIBLE",
        { status: existingOrder.status }
      );
    }

    if (existingOrder.status === OrderStatus.PENDING_VALIDATION) {
      throw new AppError(
        "Cannot generate bill for an order pending validation",
        400,
        "ORDER_NOT_ELIGIBLE",
        { status: existingOrder.status }
      );
    }

    if (existingOrder.items.length === 0) {
      throw new AppError(
        "Cannot generate bill for an order with no items",
        400,
        "ORDER_EMPTY",
        { orderId }
      );
    }

    // 3. Idempotent check: if a bill already exists, return the active invoice
    const activeBill = existingOrder.bills.find(
      (b) => b.paymentStatus !== BillPaymentStatus.VOIDED
    ) || existingOrder.bills[0];

    if (activeBill) {
      return this.formatBill(activeBill);
    }

    // 4. Atomic transaction with row locking
    const createdBill = await prisma.$transaction(
      async (tx) => {
        // Concurrency lock on order
        await tx.$queryRaw`
          SELECT id, status, tenant_id FROM orders
          WHERE id = ${orderId}::uuid AND tenant_id = ${tenantId}::uuid
          FOR UPDATE
        `;

        // Re-check for existing bill inside lock to prevent race collision
        const billInsideLock = await tx.bill.findFirst({
          where: { orderId, tenantId },
          include: {
            items: true,
            payments: true,
            order: {
              include: {
                table: true,
                room: true,
                qrCode: true,
              },
            },
          },
        });

        if (billInsideLock) {
          return billInsideLock;
        }

        // Re-fetch order items from database snapshot
        const orderItems = await tx.orderItem.findMany({
          where: { orderId },
        });

        if (orderItems.length === 0) {
          throw new AppError("Order contains no items", 400, "ORDER_EMPTY");
        }

        // Decimal-safe authoritative calculations
        let subtotal = new Prisma.Decimal(0);
        for (const it of orderItems) {
          subtotal = subtotal.add(it.totalPrice);
        }

        // Fetch tenant-specific taxation rules & service charge settings
        const tenant = await tx.tenant.findUnique({
          where: { id: tenantId },
          select: {
            cgstRate: true,
            sgstRate: true,
            serviceChargeRate: true,
            gstin: true,
            settings: true,
          },
        });

        const cgstRate =
          tenant?.cgstRate !== undefined && tenant?.cgstRate !== null
            ? Number(tenant.cgstRate)
            : 2.5;
        const sgstRate =
          tenant?.sgstRate !== undefined && tenant?.sgstRate !== null
            ? Number(tenant.sgstRate)
            : 2.5;
        const serviceChargeRate =
          tenant?.serviceChargeRate !== undefined && tenant?.serviceChargeRate !== null
            ? Number(tenant.serviceChargeRate)
            : 0.0;

        const serviceCharge = new Prisma.Decimal(
          (Number(subtotal) * (serviceChargeRate / 100)).toFixed(2)
        );

        const cgstAmount = new Prisma.Decimal(
          (Number(subtotal) * (cgstRate / 100)).toFixed(2)
        );
        const sgstAmount = new Prisma.Decimal(
          (Number(subtotal) * (sgstRate / 100)).toFixed(2)
        );
        const totalTax = cgstAmount.add(sgstAmount);
        const rawGrandTotal = subtotal.add(totalTax).add(serviceCharge);
        const roundedGrandTotal = new Prisma.Decimal(
          Math.round(Number(rawGrandTotal)).toFixed(2)
        );
        const roundingDiff = roundedGrandTotal.sub(rawGrandTotal);
        const grandTotal = roundedGrandTotal;

        const taxDetails = {
          cgstRate,
          cgstAmount: Number(cgstAmount.toFixed(2)),
          sgstRate,
          sgstAmount: Number(sgstAmount.toFixed(2)),
          serviceChargeRate,
          serviceChargeAmount: Number(serviceCharge.toFixed(2)),
          gstin: tenant?.gstin || null,
          taxes: [
            {
              name: `CGST (${cgstRate}%)`,
              ratePercentage: cgstRate,
              amount: Number(cgstAmount.toFixed(2)),
            },
            {
              name: `SGST (${sgstRate}%)`,
              ratePercentage: sgstRate,
              amount: Number(sgstAmount.toFixed(2)),
            },
          ],
          totalTax: Number(totalTax.toFixed(2)),
          discounts: [],
        };

        // Atomic sequential invoice number allocation: INV-YYYYMMDD-XXXX
        const billNumber = await sequenceService.allocateInvoiceNumber(
          tenantId,
          tx
        );

        // Persist Bill
        const newBill = await tx.bill.create({
          data: {
            tenantId,
            orderId,
            billNumber,
            subtotal,
            taxDetails: taxDetails as any,
            serviceCharge,
            discountAmount: new Prisma.Decimal("0.00"),
            grandTotal,
            roundingDifference: roundingDiff,
            paymentStatus: BillPaymentStatus.UNPAID,
          },
        });

        // Persist immutable BillItem snapshots
        for (const it of orderItems) {
          await tx.billItem.create({
            data: {
              billId: newBill.id,
              menuItemId: it.menuItemId,
              itemName: it.itemName,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              totalPrice: it.totalPrice,
              taxAmount: it.taxAmount,
            },
          });
        }

        // Table status transition: OCCUPIED -> BILL_REQUESTED (do not release table yet)
        if (existingOrder.tableId) {
          await tx.table.update({
            where: { id: existingOrder.tableId },
            data: { status: TableStatus.BILL_REQUESTED },
          }).catch(() => {});
        }

        // Transactional outbox event
        await outboxService.createEvent(tx, {
          tenantId,
          eventType: "bill.updated",
          topic: "billing:all",
          payload: {
            billId: newBill.id,
            billNumber: newBill.billNumber,
            orderId,
            grandTotal: Number(grandTotal.toFixed(2)),
            dueAmount: Number(grandTotal.toFixed(2)),
            status: "ISSUED",
          },
        });

        // Fetch complete new bill record for return
        return tx.bill.findUnique({
          where: { id: newBill.id },
          include: {
            items: true,
            payments: true,
            order: {
              include: {
                table: true,
                room: true,
                qrCode: true,
              },
            },
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 25000,
        timeout: 45000,
      }
    );

    return this.formatBill(createdBill);
  }

  /**
   * Retrieve single bill by ID with tenant security checks.
   */
  async getBillById(
    billId: string,
    tenantId?: string
  ): Promise<FormattedBillResponse> {
    let bill = await prisma.bill.findUnique({
      where: { id: billId },
      include: {
        items: true,
        payments: true,
        order: {
          include: {
            table: true,
            room: true,
            qrCode: true,
          },
        },
      },
    });

    if (!bill) {
      // Check if billId is actually an order ID
      const order = await prisma.order.findUnique({
        where: { id: billId },
        include: {
          bills: {
            include: {
              items: true,
              payments: true,
              order: {
                include: {
                  table: true,
                  room: true,
                  qrCode: true,
                },
              },
            },
          },
        },
      });

      if (order && (!tenantId || order.tenantId === tenantId)) {
        if (order.bills.length > 0) {
          bill = order.bills.find((b) => b.paymentStatus !== BillPaymentStatus.VOIDED) || order.bills[0];
        } else if (order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.PENDING_VALIDATION) {
          return await this.generateBillForOrder(order.id, order.tenantId);
        }
      }
    }

    if (!bill) {
      throw new AppError("Bill not found", 404, "BILL_NOT_FOUND", { billId });
    }

    if (tenantId && bill.tenantId !== tenantId) {
      throw new AppError("Bill not found", 404, "BILL_NOT_FOUND", { billId });
    }

    return this.formatBill(bill);
  }

  /**
   * Retrieve single bill by order ID.
   */
  async getBillByOrderId(
    orderId: string,
    tenantId?: string
  ): Promise<FormattedBillResponse> {
    const bill = await prisma.bill.findFirst({
      where: {
        orderId,
        ...(tenantId ? { tenantId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        payments: true,
        order: {
          include: {
            table: true,
            room: true,
            qrCode: true,
          },
        },
      },
    });

    if (!bill) {
      throw new AppError(
        "No invoice has been generated for this order yet",
        404,
        "BILL_NOT_FOUND",
        { orderId }
      );
    }

    return this.formatBill(bill);
  }

  /**
   * List paginated bills for a tenant.
   */
  async getAllBills(params: {
    tenantId: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: FormattedBillResponse[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    let paymentStatusFilter: BillPaymentStatus | undefined;
    if (params.status) {
      const upper = params.status.toUpperCase();
      if (upper === "ISSUED" || upper === "UNPAID") {
        paymentStatusFilter = BillPaymentStatus.UNPAID;
      } else if (upper === "PARTIALLY_PAID") {
        paymentStatusFilter = BillPaymentStatus.PARTIALLY_PAID;
      } else if (upper === "PAID") {
        paymentStatusFilter = BillPaymentStatus.PAID;
      } else if (upper === "VOIDED") {
        paymentStatusFilter = BillPaymentStatus.VOIDED;
      }
    }

    const where: Prisma.BillWhereInput = {
      tenantId: params.tenantId,
      ...(paymentStatusFilter ? { paymentStatus: paymentStatusFilter } : {}),
    };

    const [bills, total] = await Promise.all([
      prisma.bill.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          items: true,
          payments: true,
          order: {
            include: {
              table: true,
              room: true,
              qrCode: true,
            },
          },
        },
      }),
      prisma.bill.count({ where }),
    ]);

    const formatted = bills.map((b) => this.formatBill(b));

    return {
      data: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Apply authorized discount to an active bill.
   */
  async applyDiscount(
    billId: string,
    tenantId: string,
    payload: ApplyDiscountBody,
    authorizedBy = "Manager"
  ): Promise<FormattedBillResponse> {
    const updatedBill = await prisma.$transaction(
      async (tx) => {
        // Row lock on bill
        await tx.$queryRaw`
          SELECT id, payment_status, subtotal, grand_total, tenant_id FROM bills
          WHERE id = ${billId}::uuid AND tenant_id = ${tenantId}::uuid
          FOR UPDATE
        `;

        const bill = await tx.bill.findUnique({
          where: { id: billId },
          include: {
            payments: true,
            items: true,
            order: {
              include: { table: true, room: true, qrCode: true },
            },
          },
        });

        if (!bill || bill.tenantId !== tenantId) {
          throw new AppError("Bill not found", 404, "BILL_NOT_FOUND", { billId });
        }

        if (bill.paymentStatus === BillPaymentStatus.VOIDED) {
          throw new AppError("Cannot apply discount to a voided bill", 400, "BILL_VOIDED");
        }

        if (bill.paymentStatus === BillPaymentStatus.PAID) {
          throw new AppError("Cannot apply discount to a fully settled bill", 400, "BILL_SETTLED");
        }

        const successfulPayments = bill.payments.filter(
          (p) => p.status === PaymentRecordStatus.SUCCESS
        );
        const paidAmount = successfulPayments.reduce(
          (sum, p) => sum + Number(p.amount),
          0
        );

        const subtotal = Number(bill.subtotal);
        let discountAmount = 0;

        if (payload.type === "PERCENTAGE") {
          if (payload.value > 100) {
            throw new AppError("Percentage discount cannot exceed 100%", 400, "INVALID_DISCOUNT");
          }
          discountAmount = Number(((subtotal * payload.value) / 100).toFixed(2));
        } else {
          discountAmount = Number(payload.value.toFixed(2));
        }

        if (discountAmount > subtotal) {
          discountAmount = subtotal;
        }

        const discountedSubtotal = Math.max(0, subtotal - discountAmount);
        const cgstAmount = Number((discountedSubtotal * 0.025).toFixed(2));
        const sgstAmount = Number((discountedSubtotal * 0.025).toFixed(2));
        const totalTax = Number((cgstAmount + sgstAmount).toFixed(2));
        const serviceCharge = Number(bill.serviceCharge);
        const newGrandTotal = Number(
          (discountedSubtotal + totalTax + serviceCharge).toFixed(2)
        );

        if (newGrandTotal < paidAmount) {
          throw new AppError(
            `Discount would reduce grand total (${newGrandTotal}) below already collected amount (${paidAmount})`,
            400,
            "INVALID_DISCOUNT"
          );
        }

        const rawTaxDetails =
          typeof bill.taxDetails === "object" && bill.taxDetails !== null
            ? (bill.taxDetails as Record<string, any>)
            : {};

        const existingDiscounts = Array.isArray(rawTaxDetails.discounts)
          ? rawTaxDetails.discounts
          : [];

        const updatedDiscounts = [
          ...existingDiscounts,
          {
            type: payload.type,
            value: payload.value,
            amount: discountAmount,
            code: payload.code,
            reason: payload.reason,
            authorizedBy,
          },
        ];

        const updatedTaxDetails = {
          ...rawTaxDetails,
          cgstAmount,
          sgstAmount,
          totalTax,
          taxes: [
            { name: "CGST (2.5%)", ratePercentage: 2.5, amount: cgstAmount },
            { name: "SGST (2.5%)", ratePercentage: 2.5, amount: sgstAmount },
          ],
          discounts: updatedDiscounts,
        };

        const newPaymentStatus =
          newGrandTotal <= paidAmount
            ? BillPaymentStatus.PAID
            : bill.paymentStatus;

        const updated = await tx.bill.update({
          where: { id: bill.id },
          data: {
            discountAmount: new Prisma.Decimal(discountAmount),
            taxDetails: updatedTaxDetails as any,
            grandTotal: new Prisma.Decimal(newGrandTotal),
            paymentStatus: newPaymentStatus,
          },
          include: {
            items: true,
            payments: true,
            order: {
              include: { table: true, room: true, qrCode: true },
            },
          },
        });

        // Queue outbox event
        await outboxService.createEvent(tx, {
          tenantId,
          eventType: "bill.updated",
          topic: "billing:all",
          payload: {
            billId: updated.id,
            billNumber: updated.billNumber,
            orderId: updated.orderId,
            grandTotal: newGrandTotal,
            dueAmount: Math.max(0, newGrandTotal - paidAmount),
            status: updated.paymentStatus === "PAID" ? "PAID" : "ISSUED",
          },
        });

        return updated;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 25000,
        timeout: 45000,
      }
    );

    return this.formatBill(updatedBill);
  }

  /**
   * Void an unpaid bill with audit tracking.
   */
  async voidBill(
    billId: string,
    tenantId: string,
    reason: string,
    userId?: string
  ): Promise<FormattedBillResponse> {
    const updatedBill = await prisma.$transaction(
      async (tx) => {
        // Lock bill
        await tx.$queryRaw`
          SELECT id, payment_status, tenant_id FROM bills
          WHERE id = ${billId}::uuid AND tenant_id = ${tenantId}::uuid
          FOR UPDATE
        `;

        const bill = await tx.bill.findUnique({
          where: { id: billId },
          include: {
            payments: true,
            items: true,
            order: {
              include: { table: true, room: true, qrCode: true },
            },
          },
        });

        if (!bill || bill.tenantId !== tenantId) {
          throw new AppError("Bill not found", 404, "BILL_NOT_FOUND", { billId });
        }

        if (bill.paymentStatus === BillPaymentStatus.VOIDED) {
          throw new AppError("Bill is already voided", 400, "BILL_ALREADY_VOIDED");
        }

        const successfulPayments = bill.payments.filter(
          (p) => p.status === PaymentRecordStatus.SUCCESS
        );

        if (successfulPayments.length > 0) {
          throw new AppError(
            "Cannot void a bill with recorded payments. Payments must be refunded first.",
            400,
            "CANNOT_VOID_SETTLED_BILL"
          );
        }

        const rawTaxDetails =
          typeof bill.taxDetails === "object" && bill.taxDetails !== null
            ? (bill.taxDetails as Record<string, any>)
            : {};

        const updatedTaxDetails = {
          ...rawTaxDetails,
          voidedReason: reason,
          voidedBy: userId || "Manager",
          voidedAt: new Date().toISOString(),
        };

        const updated = await tx.bill.update({
          where: { id: bill.id },
          data: {
            paymentStatus: BillPaymentStatus.VOIDED,
            taxDetails: updatedTaxDetails as any,
          },
          include: {
            items: true,
            payments: true,
            order: {
              include: { table: true, room: true, qrCode: true },
            },
          },
        });

        await outboxService.createEvent(tx, {
          tenantId,
          eventType: "bill.updated",
          topic: "billing:all",
          payload: {
            billId: updated.id,
            billNumber: updated.billNumber,
            orderId: updated.orderId,
            status: "VOIDED",
          },
        });

        return updated;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 10000,
      }
    );

    return this.formatBill(updatedBill);
  }

  /**
   * Record payment tender against an open bill with idempotency and balance enforcement.
   */
  async recordPayment(
    billId: string,
    tenantId: string,
    payload: RecordPaymentBody,
    options: {
      userId?: string;
      idempotencyKey?: string;
    } = {}
  ): Promise<any> {
    const endpoint = `POST /api/v1/bills/${billId}/payments`;
    let requestHash = "";
    let existingRecordId: string | undefined;

    // 1. Pre-check idempotency if key was provided
    if (options.idempotencyKey) {
      requestHash = idempotencyService.computeRequestHash(payload);
      const check = await idempotencyService.checkIdempotency(
        tenantId,
        options.idempotencyKey,
        endpoint,
        requestHash
      );

      if (check.isCached && check.cachedResponse) {
        return check.cachedResponse;
      }
      existingRecordId = check.existingRecordId;
    }

    // 2. Execute payment in database transaction with row locks
    const result = await prisma.$transaction(
      async (tx) => {
        // Reserve idempotency key inside tx
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

        // Lock bill row
        await tx.$queryRaw`
          SELECT id, payment_status, grand_total, tenant_id FROM bills
          WHERE id = ${billId}::uuid AND tenant_id = ${tenantId}::uuid
          FOR UPDATE
        `;

        const bill = await tx.bill.findUnique({
          where: { id: billId },
          include: {
            payments: true,
            order: {
              include: {
                table: true,
                room: true,
              },
            },
          },
        });

        if (!bill || bill.tenantId !== tenantId) {
          throw new AppError("Bill not found", 404, "BILL_NOT_FOUND", { billId });
        }

        if (bill.paymentStatus === BillPaymentStatus.VOIDED) {
          throw new AppError("Cannot record payment on a voided bill", 400, "BILL_VOIDED");
        }

        // Calculate authoritative outstanding balance
        const existingPayments = bill.payments.filter(
          (p) => p.status === PaymentRecordStatus.SUCCESS
        );
        const currentPaid = existingPayments.reduce(
          (sum, p) => sum + Number(p.amount),
          0
        );

        const grandTotal = Number(bill.grandTotal);
        const dueAmount = Math.max(0, Number((grandTotal - currentPaid).toFixed(2)));

        if (dueAmount <= 0) {
          throw new AppError("Bill is already fully settled", 400, "BILL_ALREADY_PAID");
        }

        const paymentAmount = Number(payload.amount.toFixed(2));
        if (paymentAmount <= 0) {
          throw new AppError("Payment amount must be greater than 0", 400, "INVALID_AMOUNT");
        }

        // Prevent overpayment
        if (paymentAmount > dueAmount + 0.01) {
          throw new AppError(
            `Payment amount (₹${paymentAmount}) exceeds outstanding balance of ₹${dueAmount.toFixed(2)}`,
            400,
            "PAYMENT_EXCEEDS_DUE",
            { dueAmount, requestedAmount: paymentAmount }
          );
        }

        // Room charge validation
        const isRoomCharge =
          payload.method === "ROOM_CHARGE" || payload.method === "ROOM_FOLIO";

        if (isRoomCharge) {
          if (!bill.order.roomId || !bill.order.room) {
            throw new AppError(
              "Room charge is only permitted for hotel room dining orders",
              400,
              "INVALID_ROOM_CHARGE"
            );
          }

          if (bill.order.room.status !== "OCCUPIED") {
            throw new AppError(
              `Cannot post room charge: Room ${bill.order.room.roomNumber} is currently not marked occupied`,
              400,
              "ROOM_NOT_OCCUPIED"
            );
          }
        }

        // Map method to Prisma enum
        let prismaMethod: PaymentMethod;
        if (isRoomCharge) {
          prismaMethod = PaymentMethod.ROOM_FOLIO;
        } else if (payload.method === "CASH") {
          prismaMethod = PaymentMethod.CASH;
        } else if (payload.method === "CARD") {
          prismaMethod = PaymentMethod.CARD;
        } else if (payload.method === "UPI") {
          prismaMethod = PaymentMethod.UPI;
        } else {
          prismaMethod = PaymentMethod.OTHER;
        }

        // Create Payment record
        const payment = await tx.payment.create({
          data: {
            tenantId,
            billId: bill.id,
            paymentMethod: prismaMethod,
            amount: new Prisma.Decimal(paymentAmount),
            status: PaymentRecordStatus.SUCCESS,
            transactionReference:
              payload.transactionReference ||
              `TXN-${Date.now().toString().slice(-6)}`,
            notes: payload.notes || null,
            receivedByUserId: options.userId || null,
          },
        });

        // Update Bill payment status
        const newTotalPaid = Number((currentPaid + paymentAmount).toFixed(2));
        const newDueAmount = Math.max(0, Number((grandTotal - newTotalPaid).toFixed(2)));

        let newBillStatus: BillPaymentStatus;
        let isFullySettled = false;

        if (newDueAmount <= 0) {
          newBillStatus = BillPaymentStatus.PAID;
          isFullySettled = true;
        } else {
          newBillStatus = BillPaymentStatus.PARTIALLY_PAID;
        }

        const rawTaxDetails =
          typeof bill.taxDetails === "object" && bill.taxDetails !== null
            ? (bill.taxDetails as Record<string, any>)
            : {};

        const updatedTaxDetails = {
          ...rawTaxDetails,
          ...(isFullySettled ? { settledAt: new Date().toISOString() } : {}),
        };

        await tx.bill.update({
          where: { id: bill.id },
          data: {
            paymentStatus: newBillStatus,
            taxDetails: updatedTaxDetails as any,
          },
        });

        // If fully settled:
        // 1. Mark parent order COMPLETED
        // 2. Release table occupancy ONLY if table order and no other active orders
        if (isFullySettled) {
          await tx.order.update({
            where: { id: bill.orderId },
            data: { status: OrderStatus.COMPLETED },
          });

          if (bill.order.tableId) {
            const otherActiveOrders = await tx.order.count({
              where: {
                tableId: bill.order.tableId,
                status: {
                  in: [
                    OrderStatus.PLACED,
                    OrderStatus.CONFIRMED,
                    OrderStatus.PREPARING,
                    OrderStatus.READY,
                    OrderStatus.SERVED,
                  ],
                },
                id: { not: bill.orderId },
              },
            });

            if (otherActiveOrders === 0) {
              await tx.table.update({
                where: { id: bill.order.tableId },
                data: {
                  status: TableStatus.VACANT,
                  currentOrderId: null,
                },
              });
            }
          }
        }

        // Outbox real-time events
        await outboxService.createEvent(tx, {
          tenantId,
          eventType: "payment.updated",
          topic: "billing:all",
          payload: {
            paymentId: payment.id,
            billId: bill.id,
            orderId: bill.orderId,
            amount: paymentAmount,
            status: "SUCCESS",
            method: payload.method,
            paidAmount: newTotalPaid,
            dueAmount: newDueAmount,
            billStatus: newBillStatus === "PAID" ? "PAID" : "PARTIALLY_PAID",
          },
        });

        await outboxService.createEvent(tx, {
          tenantId,
          eventType: "bill.updated",
          topic: "billing:all",
          payload: {
            billId: bill.id,
            orderId: bill.orderId,
            paidAmount: newTotalPaid,
            dueAmount: newDueAmount,
            status: newBillStatus === "PAID" ? "PAID" : "PARTIALLY_PAID",
          },
        });

        const responsePayload = {
          id: payment.id,
          billId: bill.id,
          orderId: bill.orderId,
          amount: paymentAmount,
          method: payload.method,
          status: "SUCCESS",
          transactionReference: payment.transactionReference,
          paidAmount: newTotalPaid,
          dueAmount: newDueAmount,
          billStatus: newBillStatus === "PAID" ? "PAID" : "PARTIALLY_PAID",
          createdAt: payment.createdAt.toISOString(),
        };

        // Complete idempotency key
        if (idempotencyRecordId) {
          await idempotencyService.completeKey(
            tx,
            idempotencyRecordId,
            bill.orderId,
            200,
            responsePayload
          );
        }

        return responsePayload;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 25000,
        timeout: 45000,
      }
    );

    return result;
  }
}

export const billingService = new BillingService();
