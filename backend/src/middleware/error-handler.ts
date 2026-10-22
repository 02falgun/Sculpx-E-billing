import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { AppError } from "../lib/errors.js";
import { formatErrorResponse } from "../lib/response.js";
import { ErrorCode } from "../constants/error-codes.js";

/**
 * Global Fastify error handler: every thrown error leaves the API in the same envelope.
 */
export function errorHandler(
  error: FastifyError | AppError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  request.log.error({
    err: error,
    requestId: request.id,
    url: request.raw.url,
    method: request.raw.method,
  });

  if (error instanceof AppError) {
    reply.status(error.statusCode).send(formatErrorResponse(error.code, error.message, error.details));
    return;
  }

  // A Zod schema parsed outside validate(): still a client error, not a 500
  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({ field: issue.path.join("."), issue: issue.message }));
    reply.status(400).send(formatErrorResponse(ErrorCode.VALIDATION_FAILED, "Validation failed", details));
    return;
  }

  // Fastify schema validation errors
  if ("validation" in error && error.validation) {
    reply
      .status(400)
      .send(formatErrorResponse(ErrorCode.VALIDATION_FAILED, "Request schema validation failed", error.validation));
    return;
  }

  // JWT errors from @fastify/jwt
  const rawCode = (error as FastifyError).code || "";
  if (rawCode.startsWith("FST_JWT_") || rawCode.startsWith("FAST_JWT_")) {
    reply
      .status(401)
      .send(formatErrorResponse(ErrorCode.UNAUTHORIZED, "Invalid, expired, or missing authentication token"));
    return;
  }

  const statusCode = (error as FastifyError).statusCode || 500;

  if (statusCode === 429) {
    reply
      .status(429)
      .send(
        formatErrorResponse(
          ErrorCode.RATE_LIMIT_EXCEEDED,
          error.message || "Too many requests. Please try again later."
        )
      );
    return;
  }

  const message =
    statusCode >= 500 && process.env.NODE_ENV === "production"
      ? "An unexpected internal server error occurred"
      : error.message;

  reply.status(statusCode).send(formatErrorResponse(rawCode || ErrorCode.INTERNAL_SERVER_ERROR, message));
}
