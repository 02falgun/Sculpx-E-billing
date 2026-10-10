import crypto from "node:crypto";
import { Prisma, type PrismaClient, IdempotencyStatus } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../lib/errors.js";

export interface IdempotencyCheckResult {
  isCached: boolean;
  cachedResponse?: unknown;
  statusCode?: number;
  existingRecordId?: string;
}

export class IdempotencyService {
  /**
   * Deterministically hash a request payload using SHA-256.
   * Recursively sorts object keys so key order does not alter the hash.
   */
  computeRequestHash(payload: unknown): string {
    const normalized = this.canonicalizeJson(payload);
    return crypto.createHash("sha256").update(normalized).digest("hex");
  }

  private canonicalizeJson(obj: unknown): string {
    if (obj === null || typeof obj !== "object") {
      return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
      return "[" + obj.map((i) => this.canonicalizeJson(i)).join(",") + "]";
    }
    const record = obj as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const pairs = sortedKeys.map(
      (k) => `${JSON.stringify(k)}:${this.canonicalizeJson(record[k])}`
    );
    return "{" + pairs.join(",") + "}";
  }

  /**
   * Inspect existing idempotency state before acquiring write locks.
   * Returns cached response if request was previously completed.
   */
  async checkIdempotency(
    tenantId: string,
    key: string,
    endpoint: string,
    requestHash: string
  ): Promise<IdempotencyCheckResult> {
    const existing = await prisma.idempotencyKey.findUnique({
      where: {
        tenantId_key_endpoint: {
          tenantId,
          key,
          endpoint,
        },
      },
    });

    if (!existing) {
      return { isCached: false };
    }

    // Check expiry (default 24h retention)
    if (existing.expiresAt < new Date()) {
      // Record expired; allow clean recreation
      await prisma.idempotencyKey.delete({ where: { id: existing.id } }).catch(() => {});
      return { isCached: false };
    }

    // Hash conflict check: Same key with different payload must be rejected
    if (existing.requestHash !== requestHash) {
      throw new AppError(
        "Idempotency key was previously used with a different request payload",
        409,
        "IDEMPOTENCY_CONFLICT",
        { key, endpoint }
      );
    }

    if (existing.status === IdempotencyStatus.COMPLETED && existing.responseBody) {
      return {
        isCached: true,
        cachedResponse: existing.responseBody,
        statusCode: existing.responseStatus || 201,
      };
    }

    if (existing.status === IdempotencyStatus.IN_PROGRESS) {
      // Check if abandoned (> 30s)
      const ageMs = Date.now() - existing.createdAt.getTime();
      if (ageMs > 30000) {
        // Abandoned in-progress attempt; allow retry recovery
        return { isCached: false, existingRecordId: existing.id };
      }

      throw new AppError(
        "A request with this idempotency key is currently being processed",
        409,
        "IDEMPOTENCY_IN_PROGRESS",
        { key }
      );
    }

    return { isCached: false, existingRecordId: existing.id };
  }

  /**
   * Atomically reserve or acquire the idempotency key inside the transaction.
   */
  async reserveKey(
    tx: Prisma.TransactionClient,
    params: {
      tenantId: string;
      key: string;
      endpoint: string;
      requestHash: string;
      existingRecordId?: string;
    }
  ): Promise<string> {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    if (params.existingRecordId) {
      const updated = await tx.idempotencyKey.update({
        where: { id: params.existingRecordId },
        data: {
          status: IdempotencyStatus.IN_PROGRESS,
          requestHash: params.requestHash,
          expiresAt,
          updatedAt: new Date(),
        },
      });
      return updated.id;
    }

    try {
      const created = await tx.idempotencyKey.create({
        data: {
          tenantId: params.tenantId,
          key: params.key,
          endpoint: params.endpoint,
          requestHash: params.requestHash,
          status: IdempotencyStatus.IN_PROGRESS,
          expiresAt,
        },
      });
      return created.id;
    } catch (err) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        // Unique constraint violation due to concurrent insertion
        throw new AppError(
          "A request with this idempotency key is currently being processed",
          409,
          "IDEMPOTENCY_IN_PROGRESS",
          { key: params.key }
        );
      }
      throw err;
    }
  }

  /**
   * Finalize the idempotency record with the completed order response.
   */
  async completeKey(
    tx: Prisma.TransactionClient,
    recordId: string,
    orderId: string,
    statusCode: number,
    responseBody: unknown
  ): Promise<void> {
    await tx.idempotencyKey.update({
      where: { id: recordId },
      data: {
        status: IdempotencyStatus.COMPLETED,
        orderId,
        responseStatus: statusCode,
        responseBody: responseBody as any,
        updatedAt: new Date(),
      },
    });
  }
}

export const idempotencyService = new IdempotencyService();
