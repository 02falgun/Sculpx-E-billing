import type { FastifyReply, FastifyRequest } from "fastify";
import { validate } from "../lib/validate.js";
import { sendSuccess } from "../lib/response.js";
import { getActor } from "../lib/context.js";
import { billingService } from "../services/billing.service.js";
import {
  generateBillParamSchema,
  getBillParamSchema,
  getBillByOrderParamSchema,
  listBillsQuerySchema,
  applyDiscountBodySchema,
  voidBillBodySchema,
  recordPaymentBodySchema,
} from "../validations/billing.validation.js";

/**
 * Optional staff authentication: verifies the bearer token (if any) and
 * resolves the staff user. Any failure falls back to guest access.
 */
async function resolveOptionalStaff(request: FastifyRequest) {
  try {
    await request.jwtVerify();
    const userId = request.user?.sub;
    if (userId) {
      return await billingService.findUserTenant(userId);
    }
  } catch {
    // Unauthenticated guest access
  }
  return null;
}

export const billingController = {
  async generateBill(request: FastifyRequest, reply: FastifyReply) {
    const { orderId } = validate(generateBillParamSchema, request.params);
    const { user } = getActor(request);

    const bill = await billingService.generateBillForOrder(orderId, user.tenantId, user.id);

    return sendSuccess(request, reply, bill, 201, "Bill generated successfully");
  },

  async getBill(request: FastifyRequest, reply: FastifyReply) {
    const { id } = validate(getBillParamSchema, request.params);
    const staff = await resolveOptionalStaff(request);

    const bill = await billingService.getBillById(id, staff?.tenantId);

    return sendSuccess(request, reply, bill);
  },

  async getBillByOrder(request: FastifyRequest, reply: FastifyReply) {
    const { orderId } = validate(getBillByOrderParamSchema, request.params);
    const staff = await resolveOptionalStaff(request);

    const bill = await billingService.getBillByOrderId(orderId, staff?.tenantId);

    return sendSuccess(request, reply, bill);
  },

  async listBills(request: FastifyRequest, reply: FastifyReply) {
    const query = validate(listBillsQuerySchema, request.query);
    const { user } = getActor(request);

    const result = await billingService.getAllBills({
      tenantId: user.tenantId,
      status: query.status,
      page: query.page,
      limit: query.limit,
    });

    return sendSuccess(request, reply, result);
  },

  async applyDiscount(request: FastifyRequest, reply: FastifyReply) {
    const { id } = validate(getBillParamSchema, request.params);
    const body = validate(applyDiscountBodySchema, request.body);
    const { user } = getActor(request);

    const updatedBill = await billingService.applyDiscount(id, user.tenantId, body, user.name);

    return sendSuccess(request, reply, updatedBill, 200, "Discount applied successfully");
  },

  async voidBill(request: FastifyRequest, reply: FastifyReply) {
    const { id } = validate(getBillParamSchema, request.params);
    const body = validate(voidBillBodySchema, request.body);
    const { user } = getActor(request);

    const voidedBill = await billingService.voidBill(id, user.tenantId, body.reason, user.id);

    return sendSuccess(request, reply, voidedBill, 200, "Bill voided successfully");
  },

  async recordPayment(request: FastifyRequest, reply: FastifyReply) {
    const { id } = validate(getBillParamSchema, request.params);
    const body = validate(recordPaymentBodySchema, request.body);
    const idempotencyKey = request.headers["idempotency-key"] as string | undefined;

    const staff = await resolveOptionalStaff(request);
    const userId = staff?.id;
    const tenantId = staff?.tenantId || (await billingService.resolveBillTenantId(id));

    const paymentResult = await billingService.recordPayment(id, tenantId, body, {
      userId,
      idempotencyKey,
    });

    return sendSuccess(request, reply, paymentResult, 200, "Payment recorded successfully");
  },
};
