import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";

export interface ApiMeta {
  requestId?: string;
  timestamp?: string;
  serverVersion?: string;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: ApiMeta;
}

export interface ApiErrorDetail {
  field?: string;
  issue: string;
  received?: unknown;
}

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: ApiErrorDetail[] | Record<string, unknown> | unknown;
  timestamp?: string;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  error: ApiErrorPayload;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = "INTERNAL_SERVER_ERROR", details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function formatSuccessResponse<T>(
  data: T,
  req: FastifyRequest,
  message?: string
): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
    ...(message ? { message } : {}),
    meta: {
      requestId: req.id,
      timestamp: new Date().toISOString(),
      serverVersion: "1.0.0",
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

export function fastifyErrorHandler(
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
    reply.status(error.statusCode).send(
      formatErrorResponse(error.code, error.message, error.details)
    );
    return;
  }

  // Fastify validation errors
  if ("validation" in error && error.validation) {
    reply.status(400).send(
      formatErrorResponse("VALIDATION_FAILED", "Request schema validation failed", error.validation)
    );
    return;
  }

  // Handle JWT errors from @fastify/jwt
  const rawCode = (error as FastifyError).code || "";
  if (rawCode.startsWith("FST_JWT_") || rawCode.startsWith("FAST_JWT_")) {
    reply.status(401).send(
      formatErrorResponse("UNAUTHORIZED", "Invalid, expired, or missing authentication token")
    );
    return;
  }

  const statusCode = (error as FastifyError).statusCode || 500;

  if (statusCode === 429) {
    reply.status(429).send(
      formatErrorResponse("RATE_LIMIT_EXCEEDED", error.message || "Too many requests. Please try again later.")
    );
    return;
  }

  const message = statusCode >= 500 && process.env.NODE_ENV === "production"
    ? "An unexpected internal server error occurred"
    : error.message;

  const code = (error as FastifyError).code || "INTERNAL_SERVER_ERROR";

  reply.status(statusCode).send(formatErrorResponse(code, message));
}
