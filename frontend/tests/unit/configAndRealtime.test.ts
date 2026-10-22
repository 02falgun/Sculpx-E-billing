import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  resolveApiBaseUrl,
  resolveWsBaseUrl,
  resolveUseMockApi,
} from "@/config/env";
import { ApiClient } from "@/services/api/client";
import { WebSocketManager } from "@/services/websocket/socket.service";

describe("SCULPX E-Billing — API, Realtime & Environment Security Configuration", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("1. URL Resolution & Mixed Content Protection", () => {
    it("resolves default localhost API URL when unconfigured in local development", () => {
      const url = resolveApiBaseUrl(undefined, "http://localhost:3000");
      expect(url).toBe("http://localhost:8000/api/v1");
    });

    it("preserves explicitly configured remote production API URL", () => {
      const url = resolveApiBaseUrl(
        "https://api-pilot.ebilling.com/api/v1",
        "https://pos.ebilling.com"
      );
      expect(url).toBe("https://api-pilot.ebilling.com/api/v1");
    });

    it("trims trailing slashes from API URL", () => {
      const url = resolveApiBaseUrl("https://api.ebilling.com/api/v1///");
      expect(url).toBe("https://api.ebilling.com/api/v1");
    });

    it("Mixed Content Guard: automatically upgrades http to https on hosted domain when served over HTTPS", () => {
      const upgraded = resolveApiBaseUrl(
        "http://api-pilot.ebilling.com/api/v1",
        "https://pos.ebilling.com"
      );
      expect(upgraded).toBe("https://api-pilot.ebilling.com/api/v1");
    });

    it("Mixed Content Guard: preserves http on localhost even when test client origin is secure", () => {
      const local = resolveApiBaseUrl(
        "http://localhost:8000/api/v1",
        "https://localhost:3000"
      );
      expect(local).toBe("http://localhost:8000/api/v1");
    });

    it("resolves default localhost WebSocket URL when unconfigured", () => {
      const wsUrl = resolveWsBaseUrl(undefined, "http://localhost:8000/api/v1");
      expect(wsUrl).toBe("ws://localhost:8000/ws");
    });

    it("derives wss protocol automatically when API_URL is HTTPS and WS_URL is unconfigured", () => {
      const wsUrl = resolveWsBaseUrl(undefined, "https://api-pilot.ebilling.com/api/v1");
      expect(wsUrl).toBe("wss://api-pilot.ebilling.com/ws");
    });

    it("Mixed Content Guard: upgrades ws:// to wss:// for non-localhost endpoints in secure context", () => {
      const wsUrl = resolveWsBaseUrl(
        "ws://api-pilot.ebilling.com/ws",
        "https://api-pilot.ebilling.com/api/v1",
        "https://pos.ebilling.com"
      );
      expect(wsUrl).toBe("wss://api-pilot.ebilling.com/ws");
    });

    it("preserves ws:// on localhost in development mode", () => {
      const wsUrl = resolveWsBaseUrl(
        "ws://localhost:8000/ws",
        "http://localhost:8000/api/v1",
        "http://localhost:3000"
      );
      expect(wsUrl).toBe("ws://localhost:8000/ws");
    });
  });

  describe("2. Mock Switch Resolution", () => {
    it("returns false when NEXT_PUBLIC_USE_MOCK_API is explicitly 'false'", () => {
      expect(resolveUseMockApi("false", "development")).toBe(false);
      expect(resolveUseMockApi("false", "production")).toBe(false);
    });

    it("returns true when NEXT_PUBLIC_USE_MOCK_API is explicitly 'true'", () => {
      expect(resolveUseMockApi("true", "development")).toBe(true);
    });

    it("defaults to false (real backend) in production when variable is unset", () => {
      expect(resolveUseMockApi(undefined, "production")).toBe(false);
    });

    it("defaults to true (mock) in local development when variable is unset", () => {
      expect(resolveUseMockApi(undefined, "development")).toBe(true);
    });
  });

  describe("3. ApiClient Authentication & Resilience", () => {
    it("attaches Authorization header from in-memory token", async () => {
      const client = new ApiClient("http://localhost:8000/api/v1");
      client.setAuthToken("test-jwt-token-123");

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: { status: "OK" } }),
      });
      global.fetch = mockFetch;

      const res = await client.request<{ status: string }>("/health");
      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/health",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-jwt-token-123",
          }),
        })
      );
    });

    it("attaches x-qr-token header when active QR session is set without auth token", async () => {
      const client = new ApiClient("http://localhost:8000/api/v1");
      client.setActiveQrToken("table-token-1");

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({ success: true, data: { items: [] } }),
      });
      global.fetch = mockFetch;

      const res = await client.request<{ items: any[] }>("/menu/items");
      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:8000/api/v1/menu/items",
        expect.objectContaining({
          headers: expect.objectContaining({
            "x-qr-token": "table-token-1",
          }),
        })
      );
    });

    it("handles HTTP 401 Unauthorized API failure and returns standard error envelope", async () => {
      const client = new ApiClient("http://localhost:8000/api/v1");

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ "content-type": "application/json" }),
        json: async () => ({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Token expired or missing" },
        }),
      });

      const res = await client.request("/orders");
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe("UNAUTHORIZED");
      expect(res.error?.message).toContain("Token expired or missing");
    });

    it("handles network failure and returns CONNECTION_ERROR envelope", async () => {
      const client = new ApiClient("http://localhost:8000/api/v1");

      global.fetch = vi.fn().mockRejectedValue(new Error("Network connection refused"));

      const res = await client.request("/orders");
      expect(res.success).toBe(false);
      expect(res.error?.code).toBe("NETWORK_ERROR");
      expect(res.error?.message).toContain("Network error");
    });
  });

  describe("4. WebSocket Reconnect & In-Band Authentication", () => {
    it("initializes in DISCONNECTED state and transitions to CONNECTING on connect", () => {
      const wsManager = new WebSocketManager("ws://localhost:8000/ws");
      expect(wsManager.getConnectionState()).toBe("DISCONNECTED");

      // In jsdom environment, WebSocket is mockable
      const stateListener = vi.fn();
      wsManager.onStateChange(stateListener);

      wsManager.connect();
      expect(stateListener).toHaveBeenCalledWith("CONNECTING");
    });

    it("notifies listeners with RECONNECTED event upon reconnecting to trigger state reconciliation", () => {
      const wsManager = new WebSocketManager("ws://localhost:8000/ws");
      const reconnectedListener = vi.fn();

      wsManager.subscribe("RECONNECTED", reconnectedListener);

      // Simulate the notifyReconnectReconciliation event
      (wsManager as any).notifyReconnectReconciliation();

      expect(reconnectedListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "RECONNECTED",
        })
      );
    });
  });
});
