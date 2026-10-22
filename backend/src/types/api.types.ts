import type { ErrorCode } from "../constants/error-codes.js";

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
  code: ErrorCode | string;
  message: string;
  details?: ApiErrorDetail[] | Record<string, unknown> | unknown;
  timestamp?: string;
}

export interface ApiErrorResponse {
  success: false;
  data: null;
  error: ApiErrorPayload;
}
