import {
  WebSocketConnectionState,
  WebSocketEventType,
  WebSocketMessage,
} from "@/types";

export type WebSocketEventHandler<T = unknown> = (message: WebSocketMessage<T>) => void;

export type WebSocketStateListener = (state: WebSocketConnectionState) => void;

export interface IWebSocketClient {
  connect(): void;
  disconnect(): void;
  getConnectionState(): WebSocketConnectionState;
  subscribe<T = unknown>(
    eventType: WebSocketEventType,
    handler: WebSocketEventHandler<T>,
    topic?: string,
  ): () => void; // returns unsubscribe function
  subscribeToTopic(topic: string): void;
  unsubscribeFromTopic(topic: string): void;
  onStateChange(listener: WebSocketStateListener): () => void;
  send<T = unknown>(type: WebSocketEventType, payload: T, topic?: string): void;
}
