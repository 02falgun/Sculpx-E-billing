import type { FastifyReply, FastifyRequest } from "fastify";
import type { ApiErrorResponse, ApiSuccessResponse } from "../types/api.types.js";

const SERVER_VERSION = "1.0.0";

export function formatSuccessResponse<T>(
  data: T,
  request: FastifyRequest,
  message?: string
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(message ? { message } : {}),
    meta: {
      requestId: request.id,
      timestamp: new Date().toISOString(),
      serverVersion: SERVER_VERSION,
    },
  };
}

export function formatErrorResponse(
  code: string,
  message: string,
  details?: unknown
): ApiErrorResponse {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Send the standard `{ success: true, data, meta }` envelope.
 */
export function sendSuccess<T>(
  request: FastifyRequest,
  reply: FastifyReply,
  data: T,
  statusCode = 200,
  message?: string
) {
  return reply.status(statusCode).send(formatSuccessResponse(data, request, message));
}
