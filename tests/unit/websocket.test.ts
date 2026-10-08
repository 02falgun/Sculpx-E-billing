import { describe, it, expect, vi } from "vitest";
import { WebSocketManager } from "@/services/websocket/socket.service";

describe("WebSocket Manager (Phase 1 Foundation)", () => {
  it("should initialize in DISCONNECTED or CONNECTED state", () => {
    const ws = new WebSocketManager("ws://localhost:8000/ws");
    expect(["DISCONNECTED", "CONNECTING", "CONNECTED"]).toContain(ws.getConnectionState());
  });

  it("should dispatch events to registered listeners and support unsubscription", () => {
    const ws = new WebSocketManager("ws://localhost:8000/ws");
    const mockHandler = vi.fn();

    const unsubscribe = ws.subscribe("ORDER_CREATED", mockHandler);

    ws.dispatchSimulatedEvent("ORDER_CREATED", { orderId: "ord-test-1" });
    expect(mockHandler).toHaveBeenCalledTimes(1);

    // After unsubscription, handler should not be called again
    unsubscribe();
    ws.dispatchSimulatedEvent("ORDER_CREATED", { orderId: "ord-test-2" });
    expect(mockHandler).toHaveBeenCalledTimes(1);
  });
});
