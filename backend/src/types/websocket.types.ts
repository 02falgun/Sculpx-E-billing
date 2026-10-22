import type { WebSocket } from "ws";

/** Verifies a staff access token and returns its decoded claims. */
export type JwtVerifier = (token: string) => unknown;

export interface ConnectedClient {
  id: string;
  socket: WebSocket;
  tenantId?: string;
  userId?: string;
  role?: string;
  permissions: string[];
  isGuest: boolean;
  topics: Set<string>;
  connectedAt: Date;
  orderIds: Set<string>;
  remoteAddress?: string;
  jwtVerifier?: JwtVerifier;
}

export interface WsMessageEnvelope<T = unknown> {
  id: string;
  type: string;
  topic?: string;
  payload?: T;
  version?: string;
  timestamp: string;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface ActiveClientSummary {
  id: string;
  tenantId?: string;
  role?: string;
  isGuest: boolean;
  topics: string[];
  connectedAt: string;
}

export interface BroadcastEvent {
  tenantId: string;
  eventType: string;
  topic: string;
  payload: Record<string, unknown>;
}
