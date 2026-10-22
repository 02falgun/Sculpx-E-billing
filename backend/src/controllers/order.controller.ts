import type { FastifyReply, FastifyRequest } from "fastify";
import { ErrorCode } from "../constants/error-codes.js";
import { validate } from "../lib/validate.js";
import { sendSuccess } from "../lib/response.js";
import { cartService } from "../services/cart.service.js";
import { orderService } from "../services/order.service.js";
import { validateCartRequestSchema } from "../validations/cart.validation.js";
import {
  createOrderRequestSchema,
  orderHeadersSchema,
  getOrderParamsSchema,
  listOrdersQuerySchema,
  updateStatusBodySchema,
  cancelOrderBodySchema,
} from "../validations/order.validation.js";

/**
 * Optional staff authentication: decode the bearer token if present.
 * Invalid or expired tokens fall back to public (guest) access.
 */
async function decodeOptionalToken<T extends object>(request: FastifyRequest): Promise<T | undefined> {
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      return await request.jwtVerify<T>();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export const orderController = {
  async testRateLimitValidate(request: FastifyRequest, reply: FastifyReply) {
    return sendSuccess(request, reply, { status: "rate_limit_active" });
  },

  async testRateLimitOrder(request: FastifyRequest, reply: FastifyReply) {
    return sendSuccess(request, reply, { status: "order_rate_limit_active" });
  },

  async validateCart(request: FastifyRequest, reply: FastifyReply) {
    const data = validate(
      validateCartRequestSchema,
      request.body,
      "The request contains invalid cart parameters"
    );

    // Security requirement: Never log raw QR token
    request.log.info({
      event: "cart_validation_request",
      tokenLength: data.qrToken.length,
      itemCount: data.items.length,
      requestId: request.id,
    });

    const result = await cartService.validateCart(data);
    return sendSuccess(request, reply, result);
  },

  async createOrder(request: FastifyRequest, reply: FastifyReply) {
    validate(
      orderHeadersSchema,
      request.headers,
      "The request headers contain invalid values",
      ErrorCode.INVALID_HEADERS
    );

    const rawIdempotencyKey = request.headers["idempotency-key"];
    const idempotencyKey =
      typeof rawIdempotencyKey === "string" ? rawIdempotencyKey.trim() : undefined;

    const data = validate(
      createOrderRequestSchema,
      request.body,
      "The request contains invalid order parameters"
    );

    // Security requirement: Never log raw QR token or credentials
    request.log.info({
      event: "order_creation_request",
      tokenLength: data.qrToken.length,
      itemCount: data.items.length,
      hasIdempotencyKey: !!idempotencyKey,
      requestId: request.id,
    });

    const decoded = await decodeOptionalToken<{ role?: string }>(request);

    const result = await orderService.createOrder(data, {
      idempotencyKey,
      userRole: decoded?.role,
    });

    return sendSuccess(request, reply, result, 201, "Order placed successfully");
  },

  async getOrder(request: FastifyRequest, reply: FastifyReply) {
    const { id } = validate(getOrderParamsSchema, request.params, "Invalid order ID parameter");
    const decoded = await decodeOptionalToken<{ tenantId?: string }>(request);

    const order = await orderService.getOrderById(id, decoded?.tenantId);
    return sendSuccess(request, reply, order);
  },

  async listOrders(request: FastifyRequest, reply: FastifyReply) {
    const query = validate(listOrdersQuerySchema, request.query, "Invalid query parameters");
    const decoded = await decodeOptionalToken<{ tenantId?: string }>(request);
    const qrToken = (request.headers["x-qr-token"] || request.headers["X-QR-Token"]) as
      | string
      | undefined;

    const tenantId = await orderService.resolveListTenantId(decoded?.tenantId, qrToken);
    const result = await orderService.listOrders(tenantId, query);
    return sendSuccess(request, reply, result);
  },

  async updateStatus(request: FastifyRequest, reply: FastifyReply) {
    const { id } = validate(getOrderParamsSchema, request.params, "Invalid order ID");
    const body = validate(updateStatusBodySchema, request.body, "Invalid status value");
    const decoded = await decodeOptionalToken<{ tenantId?: string }>(request);

    const updated = await orderService.updateOrderStatus(id, body.status, body.note, decoded?.tenantId);
    return sendSuccess(request, reply, updated, 200, "Order status updated");
  },

  async cancelOrder(request: FastifyRequest, reply: FastifyReply) {
    const { id } = validate(getOrderParamsSchema, request.params, "Invalid order ID");
    const body = validate(cancelOrderBodySchema, request.body, "Cancellation reason is required");
    const decoded = await decodeOptionalToken<{ tenantId?: string }>(request);

    const cancelled = await orderService.cancelOrder(id, body.reason, decoded?.tenantId);
    return sendSuccess(request, reply, cancelled, 200, "Order cancelled successfully");
  },
};
