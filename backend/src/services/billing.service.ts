import { Prisma, BillPaymentStatus, OrderStatus, PaymentRecordStatus } from "@prisma/client";
import { withTransaction } from "../database/prisma.js";
import { billModel } from "../models/bill.model.js";
import { orderModel } from "../models/order.model.js";
import { tableModel } from "../models/table.model.js";
import { roomModel } from "../models/room.model.js";
import { tenantModel } from "../models/tenant.model.js";
import { userModel } from "../models/user.model.js";
import { sequenceService } from "./sequence.service.js";
import { idempotencyService } from "./idempotency.service.js";
import { outboxService } from "./outbox.service.js";
import { BadRequestError, NotFoundError } from "../lib/errors.js";
import { ErrorCode } from "../constants/error-codes.js";
import {
  formatBill,
  parseTaxDetails,
  sumSuccessfulPayments,
  settlementLabel,
  parseBillStatusFilter,
  toPaymentMethod,
  calculateInvoice,
  calculateDiscountAmount,
  calculateDiscountedTotals,
} from "./billing.calculations.js";
import type {
  ApplyDiscountBody,
  RecordPaymentBody,
} from "../validations/billing.validation.js";
import type {
  BillForPayment,
  BillListParams,
  BillListResponse,
  BillTaxDetails,
  BillWithDetails,
  FormattedBillResponse,
  PaymentRecordedResponse,
  RecordPaymentOptions,
} from "../types/billing.types.js";

const LONG_TX_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  maxWait: 25000,
  timeout: 45000,
};

function billNotFound(billId: string): NotFoundError {
  return new NotFoundError("Bill not found", ErrorCode.BILL_NOT_FOUND, { billId });
}

/** The first non-voided bill, falling back to the first bill. */
function pickActiveBill<T extends { paymentStatus: BillPaymentStatus }>(bills: T[]): T | undefined {
  return bills.find((b) => b.paymentStatus !== BillPaymentStatus.VOIDED) || bills[0];
}

// BillTaxDetails is declared JSON-compatible, so this only widens it for Prisma.
function toTaxDetailsJson(details: BillTaxDetails): Prisma.InputJsonObject {
  return details;
}

/**
 * Accept a payment up to the due amount. An overpayment is only allowed when the
 * notes mention a tip/gratuity: the excess is noted and only the due amount is recorded.
 */
function resolveTender(
  paymentAmount: number,
  dueAmount: number,
  notes: string | null
): { recordedAmount: number; notes: string | null } {
  if (paymentAmount <= dueAmount + 0.01) {
    return { recordedAmount: paymentAmount, notes };
  }

  const lowerNotes = notes?.toLowerCase();
  const isTipGratuity = lowerNotes && (lowerNotes.includes("gratuity") || lowerNotes.includes("tip"));
  if (!isTipGratuity) {
    throw new BadRequestError(
      `Payment amount (₹${paymentAmount}) exceeds outstanding balance of ₹${dueAmount.toFixed(2)}`,
      ErrorCode.PAYMENT_EXCEEDS_DUE,
      { dueAmount, requestedAmount: paymentAmount }
    );
  }

  const gratuity = Number((paymentAmount - dueAmount).toFixed(2));
  return { recordedAmount: dueAmount, notes: `${notes} (Gratuity ₹${gratuity})` };
}

/** Complete the order and release its table when no other orders are active on it. */
async function settleOrder(bill: BillForPayment, tx: Prisma.TransactionClient): Promise<void> {
  await orderModel.complete(bill.orderId, tx);

  if (!bill.order.tableId) return;
  const otherActiveOrders = await orderModel.countOtherActiveForTable(
    bill.order.tableId,
    bill.orderId,
    tx
  );
  if (otherActiveOrders === 0) {
    await tableModel.release(bill.order.tableId, tx);
  }
}

export class BillingService {
  /** Format a Prisma Bill into the API response shape. */
  formatBill(bill: BillWithDetails): FormattedBillResponse {
    return formatBill(bill);
  }

  /**
   * Transactionally generate the tax invoice for a dining order.
   * Server-authoritative pricing snapshots, atomic sequential numbering,
   * duplicate prevention and transactional outbox events.
   */
  async generateBillForOrder(
    orderId: string,
    tenantId: string,
    _userId?: string
  ): Promise<FormattedBillResponse> {
    const existingOrder = await billModel.findOrderForBilling(orderId, tenantId);

    if (!existingOrder) {
      throw new NotFoundError("Order not found", ErrorCode.ORDER_NOT_FOUND, { orderId });
    }
    if (existingOrder.status === OrderStatus.CANCELLED) {
      throw new BadRequestError("Cannot generate bill for a cancelled order", ErrorCode.ORDER_NOT_ELIGIBLE, { status: existingOrder.status });
    }
    if (existingOrder.status === OrderStatus.PENDING_VALIDATION) {
      throw new BadRequestError("Cannot generate bill for an order pending validation", ErrorCode.ORDER_NOT_ELIGIBLE, { status: existingOrder.status });
    }
    if (existingOrder.items.length === 0) {
      throw new BadRequestError("Cannot generate bill for an order with no items", ErrorCode.ORDER_EMPTY, { orderId });
    }

    // Idempotent: an order that already has a bill returns its active invoice
    const activeBill = pickActiveBill(existingOrder.bills);
    if (activeBill) {
      return formatBill(activeBill);
    }

    const createdBill = await withTransaction(async (tx) => {
      await billModel.lockOrderForUpdate(orderId, tenantId, tx);

      // Re-check inside the lock to prevent a concurrent duplicate
      const billInsideLock = await billModel.findByOrderWithDetails(orderId, tenantId, tx);
      if (billInsideLock) {
        return billInsideLock;
      }

      const orderItems = await orderModel.findItems(orderId, tx);
      if (orderItems.length === 0) {
        throw new BadRequestError("Order contains no items", ErrorCode.ORDER_EMPTY);
      }

      const tenant = await tenantModel.findBillingSettings(tenantId, tx);
      const { subtotal, serviceCharge, grandTotal, roundingDifference, taxDetails } =
        calculateInvoice(orderItems, tenant);

      // INV-YYYYMMDD-XXXX
      const billNumber = await sequenceService.allocateInvoiceNumber(tenantId, tx);

      const newBill = await billModel.create(
        {
          tenantId,
          orderId,
          billNumber,
          subtotal,
          taxDetails,
          serviceCharge,
          discountAmount: new Prisma.Decimal("0.00"),
          grandTotal,
          roundingDifference,
          paymentStatus: BillPaymentStatus.UNPAID,
        },
        tx
      );

      // Immutable BillItem snapshots
      for (const it of orderItems) {
        await billModel.createItem(
          {
            billId: newBill.id,
            menuItemId: it.menuItemId,
            itemName: it.itemName,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            totalPrice: it.totalPrice,
            taxAmount: it.taxAmount,
          },
          tx
        );
      }

      // OCCUPIED -> BILL_REQUESTED; the table is released on settlement
      if (existingOrder.tableId) {
        await tableModel.markBillRequested(existingOrder.tableId, tx).catch(() => {});
      }

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

      return billModel.findByIdWithDetails(newBill.id, tx);
    }, LONG_TX_OPTIONS);

    // Non-null: the bill was created (or found) inside the transaction above.
    return formatBill(createdBill!);
  }

  /** Look up the tenant and id of a staff user (optional-auth bill endpoints). */
  async findUserTenant(userId: string): Promise<{ id: string; tenantId: string } | null> {
    return userModel.findTenantRef(userId);
  }

  /** Resolve the owning tenant of a bill for unauthenticated guest checkout. */
  async resolveBillTenantId(billId: string): Promise<string> {
    const bill = await billModel.findTenantId(billId);
    if (!bill) {
      throw billNotFound(billId);
    }
    return bill.tenantId;
  }

  /**
   * Retrieve a bill by ID with tenant checks. An order ID is also accepted: it
   * resolves to the order's active bill, generating one if the order is billable.
   */
  async getBillById(billId: string, tenantId?: string): Promise<FormattedBillResponse> {
    let bill: BillWithDetails | null | undefined = await billModel.findByIdWithDetails(billId);

    if (!bill) {
      const order = await billModel.findOrderWithBills(billId);

      if (order && (!tenantId || order.tenantId === tenantId)) {
        if (order.bills.length > 0) {
          bill = pickActiveBill(order.bills);
        } else if (order.status !== OrderStatus.CANCELLED && order.status !== OrderStatus.PENDING_VALIDATION) {
          return await this.generateBillForOrder(order.id, order.tenantId);
        }
      }
    }

    if (!bill || (tenantId && bill.tenantId !== tenantId)) {
      throw billNotFound(billId);
    }

    return formatBill(bill);
  }

  /** Retrieve the latest bill for an order. */
  async getBillByOrderId(orderId: string, tenantId?: string): Promise<FormattedBillResponse> {
    const bill = await billModel.findLatestByOrder(orderId, tenantId);

    if (!bill) {
      throw new NotFoundError("No invoice has been generated for this order yet", ErrorCode.BILL_NOT_FOUND, { orderId });
    }

    return formatBill(bill);
  }

  /** List paginated bills for a tenant. */
  async getAllBills(params: BillListParams): Promise<BillListResponse> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const { bills, total } = await billModel.findPage(
      params.tenantId,
      parseBillStatusFilter(params.status),
      limit,
      skip
    );

    return {
      data: bills.map((b) => formatBill(b)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /** Apply an authorized discount to an open bill and re-tax it. */
  async applyDiscount(
    billId: string,
    tenantId: string,
    payload: ApplyDiscountBody,
    authorizedBy = "Manager"
  ): Promise<FormattedBillResponse> {
    const updatedBill = await withTransaction(async (tx) => {
      await billModel.lockForUpdate(billId, tenantId, tx);

      const bill = await billModel.findByIdWithDetails(billId, tx);
      if (!bill || bill.tenantId !== tenantId) {
        throw billNotFound(billId);
      }
      if (bill.paymentStatus === BillPaymentStatus.VOIDED) {
        throw new BadRequestError("Cannot apply discount to a voided bill", ErrorCode.BILL_VOIDED);
      }
      if (bill.paymentStatus === BillPaymentStatus.PAID) {
        throw new BadRequestError("Cannot apply discount to a fully settled bill", ErrorCode.BILL_SETTLED);
      }

      const paidAmount = sumSuccessfulPayments(bill.payments);
      const subtotal = Number(bill.subtotal);

      if (payload.type === "PERCENTAGE" && payload.value > 100) {
        throw new BadRequestError("Percentage discount cannot exceed 100%", ErrorCode.INVALID_DISCOUNT);
      }
      const discountAmount = calculateDiscountAmount(subtotal, payload);

      const { cgstAmount, sgstAmount, totalTax, grandTotal: newGrandTotal } =
        calculateDiscountedTotals(subtotal, discountAmount, Number(bill.serviceCharge));

      if (newGrandTotal < paidAmount) {
        throw new BadRequestError(`Discount would reduce grand total (${newGrandTotal}) below already collected amount (${paidAmount})`, ErrorCode.INVALID_DISCOUNT);
      }

      const rawTaxDetails = parseTaxDetails(bill.taxDetails);
      const existingDiscounts = Array.isArray(rawTaxDetails.discounts)
        ? rawTaxDetails.discounts
        : [];

      const updatedTaxDetails: BillTaxDetails = {
        ...rawTaxDetails,
        cgstAmount,
        sgstAmount,
        totalTax,
        taxes: [
          { name: "CGST (2.5%)", ratePercentage: 2.5, amount: cgstAmount },
          { name: "SGST (2.5%)", ratePercentage: 2.5, amount: sgstAmount },
        ],
        discounts: [
          ...existingDiscounts,
          {
            type: payload.type,
            value: payload.value,
            amount: discountAmount,
            code: payload.code,
            reason: payload.reason,
            authorizedBy,
          },
        ],
      };

      const updated = await billModel.updateWithDetails(
        bill.id,
        {
          discountAmount: new Prisma.Decimal(discountAmount),
          taxDetails: toTaxDetailsJson(updatedTaxDetails),
          grandTotal: new Prisma.Decimal(newGrandTotal),
          paymentStatus: newGrandTotal <= paidAmount ? BillPaymentStatus.PAID : bill.paymentStatus,
        },
        tx
      );

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
    }, LONG_TX_OPTIONS);

    return formatBill(updatedBill);
  }

  /** Void a bill that has no successful payments. */
  async voidBill(
    billId: string,
    tenantId: string,
    reason: string,
    userId?: string
  ): Promise<FormattedBillResponse> {
    const updatedBill = await withTransaction(
      async (tx) => {
        await billModel.lockForUpdate(billId, tenantId, tx);

        const bill = await billModel.findByIdWithDetails(billId, tx);
        if (!bill || bill.tenantId !== tenantId) {
          throw billNotFound(billId);
        }
        if (bill.paymentStatus === BillPaymentStatus.VOIDED) {
          throw new BadRequestError("Bill is already voided", ErrorCode.BILL_ALREADY_VOIDED);
        }
        if (bill.payments.some((p) => p.status === PaymentRecordStatus.SUCCESS)) {
          throw new BadRequestError("Cannot void a bill with recorded payments. Payments must be refunded first.", ErrorCode.CANNOT_VOID_SETTLED_BILL);
        }

        const updated = await billModel.updateWithDetails(
          bill.id,
          {
            paymentStatus: BillPaymentStatus.VOIDED,
            taxDetails: toTaxDetailsJson({
              ...parseTaxDetails(bill.taxDetails),
              voidedReason: reason,
              voidedBy: userId || "Manager",
              voidedAt: new Date().toISOString(),
            }),
          },
          tx
        );

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

    return formatBill(updatedBill);
  }

  /**
   * Record a payment against an open bill, with optional idempotency and
   * server-side balance enforcement. `billId` may also be an order ID.
   */
  async recordPayment(
    billId: string,
    tenantId: string,
    payload: RecordPaymentBody,
    options: RecordPaymentOptions = {}
  ): Promise<PaymentRecordedResponse> {
    const endpoint = `POST /api/v1/bills/${billId}/payments`;
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
        return check.cachedResponse as PaymentRecordedResponse;
      }
      existingRecordId = check.existingRecordId;
    }

    return withTransaction(async (tx) => {
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

      await billModel.lockForUpdate(billId, tenantId, tx);

      const bill =
        (await billModel.findByIdForPayment(billId, tx)) ??
        (await billModel.findByOrderForPayment(billId, tenantId, tx));

      if (!bill || bill.tenantId !== tenantId) {
        throw billNotFound(billId);
      }
      if (bill.paymentStatus === BillPaymentStatus.VOIDED) {
        throw new BadRequestError("Cannot record payment on a voided bill", ErrorCode.BILL_VOIDED);
      }

      const currentPaid = sumSuccessfulPayments(bill.payments);
      const grandTotal = Number(bill.grandTotal);
      const dueAmount = Math.max(0, Number((grandTotal - currentPaid).toFixed(2)));

      if (dueAmount <= 0) {
        throw new BadRequestError("Bill is already fully settled", ErrorCode.BILL_ALREADY_PAID);
      }

      const paymentAmount = Number(payload.amount.toFixed(2));
      if (paymentAmount <= 0) {
        throw new BadRequestError("Payment amount must be greater than 0", ErrorCode.INVALID_AMOUNT);
      }

      const { recordedAmount: recordedPaymentAmount, notes: paymentNotes } = resolveTender(
        paymentAmount,
        dueAmount,
        payload.notes || null
      );

      const isRoomCharge = payload.method === "ROOM_CHARGE" || payload.method === "ROOM_FOLIO";
      if (isRoomCharge) {
        if (!bill.order.roomId || !bill.order.room) {
          throw new BadRequestError("Room charge is only permitted for hotel room dining orders", ErrorCode.INVALID_ROOM_CHARGE);
        }
        if (bill.order.room.status !== "OCCUPIED") {
          await roomModel.markOccupied(bill.order.room.id, tx);
        }
      }

      const payment = await billModel.createPayment(
        {
          tenantId,
          billId: bill.id,
          paymentMethod: toPaymentMethod(payload.method),
          amount: new Prisma.Decimal(recordedPaymentAmount),
          status: PaymentRecordStatus.SUCCESS,
          transactionReference:
            payload.transactionReference ||
            `TXN-${Date.now().toString().slice(-6)}`,
          notes: paymentNotes,
          receivedByUserId: options.userId || null,
        },
        tx
      );

      const newTotalPaid = Number((currentPaid + recordedPaymentAmount).toFixed(2));
      const newDueAmount = Math.max(0, Number((grandTotal - newTotalPaid).toFixed(2)));
      const isFullySettled = newDueAmount <= 0;
      const newBillStatus = isFullySettled
        ? BillPaymentStatus.PAID
        : BillPaymentStatus.PARTIALLY_PAID;

      await billModel.update(
        bill.id,
        {
          paymentStatus: newBillStatus,
          taxDetails: toTaxDetailsJson({
            ...parseTaxDetails(bill.taxDetails),
            ...(isFullySettled ? { settledAt: new Date().toISOString() } : {}),
          }),
        },
        tx
      );

      if (isFullySettled) {
        await settleOrder(bill, tx);
      }

      const billStatus = settlementLabel(newBillStatus);

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
          billStatus,
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
          status: billStatus,
        },
      });

      const responsePayload: PaymentRecordedResponse = {
        id: payment.id,
        billId: bill.id,
        orderId: bill.orderId,
        amount: paymentAmount,
        method: payload.method,
        status: "SUCCESS",
        transactionReference: payment.transactionReference,
        paidAmount: newTotalPaid,
        dueAmount: newDueAmount,
        billStatus,
        createdAt: payment.createdAt.toISOString(),
      };

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
    }, LONG_TX_OPTIONS);
  }
}

export const billingService = new BillingService();
