export interface IdempotencyCheckResult {
  isCached: boolean;
  cachedResponse?: unknown;
  statusCode?: number;
  existingRecordId?: string;
}

export interface ReserveIdempotencyKeyParams {
  tenantId: string;
  key: string;
  endpoint: string;
  requestHash: string;
  existingRecordId?: string;
}
