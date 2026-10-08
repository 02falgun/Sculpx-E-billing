import {
  WebSocketConnectionState,
  WebSocketEventType,
  WebSocketMessage,
} from "@/types";
import {
  IWebSocketClient,
  WebSocketEventHandler,
  WebSocketStateListener,
} from "./interfaces";
import { ENV } from "@/config";

export class WebSocketManager implements IWebSocketClient {
  private url: string;
  private socket: WebSocket | null = null;
  private state: WebSocketConnectionState = "DISCONNECTED";
  private listeners = new Map<string, Set<WebSocketEventHandler>>();
  private stateListeners = new Set<WebSocketStateListener>();
  private processedMessageIds = new Set<string>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isExplicitlyClosed = false;
  private mockIntervalTimer: NodeJS.Timeout | null = null;

  constructor(url: string = ENV.WS_URL) {
    this.url = url;
  }

  public getConnectionState(): WebSocketConnectionState {
    return this.state;
  }

  private setState(newState: WebSocketConnectionState) {
    if (this.state !== newState) {
      this.state = newState;
      this.stateListeners.forEach((listener) => listener(newState));
    }
  }

  public connect(): void {
    if (typeof window === "undefined") return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;
    this.setState("CONNECTING");

    // If using mock API or running in mock mode, provide a simulated real-time WebSocket connection
    if (ENV.USE_MOCK_API) {
      this.initMockConnection();
      return;
    }

    try {
      this.socket = new WebSocket(this.url);

      this.socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.setState("CONNECTED");
        this.startHeartbeat();
      };

      this.socket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleIncomingMessage(message);
        } catch {
          // Ignore unparseable frames
        }
      };

      this.socket.onclose = () => {
        this.cleanupSocket();
        if (!this.isExplicitlyClosed) {
          this.setState("DISCONNECTED");
          this.scheduleReconnect();
        }
      };

      this.socket.onerror = () => {
        this.setState("ERROR");
      };
    } catch {
      this.setState("ERROR");
      this.scheduleReconnect();
    }
  }

  private initMockConnection() {
    setTimeout(() => {
      this.setState("CONNECTED");
    }, 300);
  }

  private handleIncomingMessage(message: WebSocketMessage) {
    // Deduplication check
    if (message.id && this.processedMessageIds.has(message.id)) {
      return;
    }
    if (message.id) {
      this.processedMessageIds.add(message.id);
      // Keep deduplication set bounded
      if (this.processedMessageIds.size > 1000) {
        const oldest = this.processedMessageIds.values().next().value;
        if (oldest) this.processedMessageIds.delete(oldest);
      }
    }

    // Dispatch to specific topic/event listeners
    const specificKey = `${message.type}:${message.topic || "*"}`;
    const wildcardKey = `${message.type}:*`;
    const typeKey = message.type;

    const handlersToInvoke = new Set<WebSocketEventHandler>();

    [specificKey, wildcardKey, typeKey, "*"].forEach((key) => {
      const handlers = this.listeners.get(key);
      if (handlers) {
        handlers.forEach((h) => handlersToInvoke.add(h));
      }
    });

    handlersToInvoke.forEach((handler) => {
      try {
        handler(message);
      } catch (err) {
        console.error("Error in WebSocket handler:", err);
      }
    });
  }

  public dispatchSimulatedEvent<T>(type: WebSocketEventType, payload: T, topic?: string) {
    const simulatedMessage: WebSocketMessage<T> = {
      id: `sim-msg-${Date.now()}-${Math.random()}`,
      type,
      topic,
      payload,
      timestamp: new Date().toISOString(),
    };
    this.handleIncomingMessage(simulatedMessage as WebSocketMessage);
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isExplicitlyClosed) {
      return;
    }

    this.setState("RECONNECTING");
    this.reconnectAttempts++;

    // Exponential backoff: min 1s, capped at 30s + randomized jitter
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 30000) + Math.random() * 500;

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({ type: "HEARTBEAT", timestamp: Date.now() }));
      }
    }, 25000);
  }

  private cleanupSocket() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket = null;
    }
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.mockIntervalTimer) clearInterval(this.mockIntervalTimer);
    this.cleanupSocket();
    this.setState("DISCONNECTED");
  }

  public subscribe<T = unknown>(
    eventType: WebSocketEventType,
    handler: WebSocketEventHandler<T>,
    topic?: string,
  ): () => void {
    const key = topic ? `${eventType}:${topic}` : eventType;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }

    const set = this.listeners.get(key)!;
    const typedHandler = handler as WebSocketEventHandler;
    set.add(typedHandler);

    return () => {
      set.delete(typedHandler);
      if (set.size === 0) {
        this.listeners.delete(key);
      }
    };
  }

  public subscribeToTopic(topic: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "SUBSCRIBE", topic }));
    }
  }

  public unsubscribeFromTopic(topic: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type: "UNSUBSCRIBE", topic }));
    }
  }

  public onStateChange(listener: WebSocketStateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  public send<T = unknown>(type: WebSocketEventType, payload: T, topic?: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          id: `msg-${Date.now()}-${Math.random()}`,
          type,
          topic,
          payload,
          timestamp: new Date().toISOString(),
        }),
      );
    }
  }
}

// Global shared singleton
export const webSocketManager = new WebSocketManager();
