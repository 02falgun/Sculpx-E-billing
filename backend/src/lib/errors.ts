import { ErrorCode } from "../constants/error-codes.js";

/**
 * Base class for every error the API returns on purpose.
 * The global error handler turns it into `{ success: false, error: { code, message, details } }`.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
    details?: unknown
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

/** 400 — the request is well-formed but not acceptable. */
export class BadRequestError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.VALIDATION_FAILED, details?: unknown) {
    super(message, 400, code, details);
    this.name = "BadRequestError";
  }
}

/** 401 — missing or invalid credentials. */
export class UnauthorizedError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.UNAUTHORIZED, details?: unknown) {
    super(message, 401, code, details);
    this.name = "UnauthorizedError";
  }
}

/** 403 — authenticated but not allowed. */
export class ForbiddenError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.FORBIDDEN, details?: unknown) {
    super(message, 403, code, details);
    this.name = "ForbiddenError";
  }
}

/** 404 — the resource does not exist (or is not visible to the caller). */
export class NotFoundError extends AppError {
  constructor(message: string, code: ErrorCode = ErrorCode.NOT_FOUND, details?: unknown) {
    super(message, 404, code, details);
    this.name = "NotFoundError";
  }
}

/** 409 — the request conflicts with current state (duplicates, already processed). */
export class ConflictError extends AppError {
  constructor(message: string, code: ErrorCode, details?: unknown) {
    super(message, 409, code, details);
    this.name = "ConflictError";
  }
}
