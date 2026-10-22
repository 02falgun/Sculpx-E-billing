import type { OutboxEvent } from "@prisma/client";

/** Custom transport for outbox events (tests replace the WebSocket broadcaster with this). */
export type OutboxDispatcher = (event: OutboxEvent) => Promise<void>;

export interface OutboxEventInput {
  tenantId: string;
  eventType: string;
  topic: string;
  payload: Record<string, unknown>;
}

export interface OutboxStats {
  pending: number;
  processing: number;
  published: number;
  failed: number;
}
