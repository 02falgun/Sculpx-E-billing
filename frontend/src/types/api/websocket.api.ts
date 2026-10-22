/**
 * SCULPX E-Billing — Realtime WebSocket Wire Protocol Contracts
 */

import { WebSocketEventType } from "../websocket";

export interface WebSocketWireFrame<T = unknown> {
  id: string; // UUID v4 message ID for deduplication
  type: WebSocketEventType;
  topic?: string; // e.g. "orders:all", "order:ord-123", "kitchen:kots", "billing:all"
  payload: T;
  timestamp: string; // ISO 8601 UTC
}

export interface WebSocketSubscribeMessage {
  action: "SUBSCRIBE" | "UNSUBSCRIBE";
  topic: string;
  token?: string; // Optional JWT token for private channel authorization
}

export interface WebSocketHeartbeatMessage {
  type: "HEARTBEAT";
  timestamp: string;
}
