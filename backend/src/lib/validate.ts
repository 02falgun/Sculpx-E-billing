import type { ZodType, ZodTypeDef } from "zod";
import { BadRequestError } from "./errors.js";
import { ErrorCode } from "../constants/error-codes.js";

/**
 * Parse `data` with a Zod schema and return the typed result.
 * Throws a 400 BadRequestError (default code VALIDATION_FAILED) with per-field details on failure.
 */
export function validate<T>(
  schema: ZodType<T, ZodTypeDef, unknown>,
  data: unknown,
  message = "Validation failed",
  code: ErrorCode = ErrorCode.VALIDATION_FAILED
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join("."),
      issue: issue.message,
    }));
    throw new BadRequestError(message, code, details);
  }
  return result.data;
}
