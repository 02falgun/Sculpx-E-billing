import type { FastifyPluginAsync } from "fastify";
import { billingService } from "../services/billing.service.js";
import { authenticate, requireRoles } from "../middleware/auth.js";
import {
  generateBillParamSchema,
  getBillParamSchema,
  getBillByOrderParamSchema,
  listBillsQuerySchema,
  applyDiscountBodySchema,
  voidBillBodySchema,
  recordPaymentBodySchema,
} from "../schemas/billing.schema.js";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";

export const billingRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /bills/order/:orderId/generate
   * Generate official GST tax invoice for a dining order.
   * Access: CASHIER, MANAGER, ADMIN, SUPER_ADMIN.
   */
  fastify.post(
    "/order/:orderId/generate",
    {
      preHandler: [
        requireRoles("CASHIER", "MANAGER", "ADMIN", "SUPER_ADMIN"),
      ],
    },
    async (request, reply) => {
      const { orderId } = generateBillParamSchema.parse(request.params);
      const user = request.authenticatedUser!;

      const bill = await billingService.generateBillForOrder(
        orderId,
        user.tenantId,
        user.id
      );

      return reply.code(201).send({
        success: true,
        data: bill,
        message: "Bill generated successfully",
      });
    }
  );

  /**
   * GET /bills/:id
   * Retrieve single invoice by UUID.
   * Access: Authenticated staff or public dining guest.
   */
  fastify.get("/:id", async (request, reply) => {
    const { id } = getBillParamSchema.parse(request.params);

    // Optional authentication check
    let tenantId: string | undefined;
    try {
      await request.jwtVerify();
      const userId = request.user?.sub;
      if (userId) {
        const u = await prisma.user.findUnique({
          where: { id: userId },
          select: { tenantId: true },
        });
        tenantId = u?.tenantId;
      }
    } catch {
      // Unauthenticated guest retrieval allowed for their bill
    }

    const bill = await billingService.getBillById(id, tenantId);

    return reply.send({
      success: true,
      data: bill,
    });
  });

  /**
   * GET /bills/order/:orderId
   * Retrieve bill for a specific order ID.
   */
  fastify.get("/order/:orderId", async (request, reply) => {
    const { orderId } = getBillByOrderParamSchema.parse(request.params);

    let tenantId: string | undefined;
    try {
      await request.jwtVerify();
      const userId = request.user?.sub;
      if (userId) {
        const u = await prisma.user.findUnique({
          where: { id: userId },
          select: { tenantId: true },
        });
        tenantId = u?.tenantId;
      }
    } catch {
      // Unauthenticated guest retrieval
    }

    const bill = await billingService.getBillByOrderId(orderId, tenantId);

    return reply.send({
      success: true,
      data: bill,
    });
  });

  /**
   * GET /bills
   * List paginated bills for tenant.
   * Access: CASHIER, MANAGER, ADMIN, SUPER_ADMIN.
   */
  fastify.get(
    "",
    {
      preHandler: [
        requireRoles("CASHIER", "MANAGER", "ADMIN", "SUPER_ADMIN"),
      ],
    },
    async (request, reply) => {
      const query = listBillsQuerySchema.parse(request.query);
      const user = request.authenticatedUser!;

      const result = await billingService.getAllBills({
        tenantId: user.tenantId,
        status: query.status,
        page: query.page,
        limit: query.limit,
      });

      return reply.send({
        success: true,
        data: result,
      });
    }
  );

  /**
   * POST /bills/:id/discount
   * Apply authorized discount to an open bill.
   * Access: MANAGER, ADMIN, SUPER_ADMIN.
   */
  fastify.post(
    "/:id/discount",
    {
      preHandler: [
        requireRoles("MANAGER", "ADMIN", "SUPER_ADMIN"),
      ],
    },
    async (request, reply) => {
      const { id } = getBillParamSchema.parse(request.params);
      const body = applyDiscountBodySchema.parse(request.body);
      const user = request.authenticatedUser!;

      const updatedBill = await billingService.applyDiscount(
        id,
        user.tenantId,
        body,
        user.name
      );

      return reply.send({
        success: true,
        data: updatedBill,
        message: "Discount applied successfully",
      });
    }
  );

  /**
   * POST /bills/:id/void
   * Void an unpaid bill with supervisor reason.
   * Access: MANAGER, ADMIN, SUPER_ADMIN.
   */
  fastify.post(
    "/:id/void",
    {
      preHandler: [
        requireRoles("MANAGER", "ADMIN", "SUPER_ADMIN"),
      ],
    },
    async (request, reply) => {
      const { id } = getBillParamSchema.parse(request.params);
      const body = voidBillBodySchema.parse(request.body);
      const user = request.authenticatedUser!;

      const voidedBill = await billingService.voidBill(
        id,
        user.tenantId,
        body.reason,
        user.id
      );

      return reply.send({
        success: true,
        data: voidedBill,
        message: "Bill voided successfully",
      });
    }
  );

  /**
   * POST /bills/:id/payments
   * Record payment tender against an open bill with idempotency and balance recalculation.
   * Access: CASHIER, MANAGER, ADMIN, SUPER_ADMIN or public dining guest.
   */
  fastify.post("/:id/payments", async (request, reply) => {
    const { id } = getBillParamSchema.parse(request.params);
    const body = recordPaymentBodySchema.parse(request.body);
    const idempotencyKey = request.headers["idempotency-key"] as string | undefined;

    // Optional user authentication
    let tenantId: string | undefined;
    let userId: string | undefined;

    try {
      await request.jwtVerify();
      const sub = request.user?.sub;
      if (sub) {
        const u = await prisma.user.findUnique({
          where: { id: sub },
          select: { id: true, tenantId: true },
        });
        if (u) {
          tenantId = u.tenantId;
          userId = u.id;
        }
      }
    } catch {
      // Unauthenticated customer checkout
    }

    // If unauthenticated guest, resolve tenant directly from the bill
    if (!tenantId) {
      const bill = await prisma.bill.findUnique({
        where: { id },
        select: { tenantId: true },
      });
      if (!bill) {
        throw new AppError("Bill not found", 404, "BILL_NOT_FOUND", { billId: id });
      }
      tenantId = bill.tenantId;
    }

    const paymentResult = await billingService.recordPayment(
      id,
      tenantId,
      body,
      {
        userId,
        idempotencyKey,
      }
    );

    return reply.code(200).send({
      success: true,
      data: paymentResult,
      message: "Payment recorded successfully",
    });
  });
};
