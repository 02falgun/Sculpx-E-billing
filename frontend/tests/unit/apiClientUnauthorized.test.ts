import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ApiClient } from "@/services/api/client";

function mockFetchStatus(status: number) {
  const body = { success: false, data: null, error: { code: "UNAUTHORIZED", message: "x" } };
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: "",
    json: () => Promise.resolve(body),
  });
}

describe("ApiClient — global 401 handling", () => {
  let client: ApiClient;
  let handler: ReturnType<typeof vi.fn<() => void>>;

  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    client = new ApiClient("http://api.test/api/v1");
    handler = vi.fn<() => void>();
    client.onUnauthorized(handler);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("notifies when an authenticated staff request is rejected with 401", async () => {
    vi.stubGlobal("fetch", mockFetchStatus(401));
    client.setAuthToken("expired-token");

    const res = await client.get("/locations");

    expect(res.success).toBe(false);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(client.getAuthToken()).toBeNull();
  });

  it("handles a burst of concurrent 401s only once", async () => {
    vi.stubGlobal("fetch", mockFetchStatus(401));
    client.setAuthToken("expired-token");

    await Promise.all([client.get("/locations"), client.get("/tables"), client.get("/rooms")]);

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not treat a failed login (wrong password) as an expired session", async () => {
    vi.stubGlobal("fetch", mockFetchStatus(401));
    client.setAuthToken("old-token");

    await client.post("/auth/login", { email: "a@b.com", password: "wrong" });
    await client.post("/auth/logout");

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not notify for guest (QR) requests without a staff token", async () => {
    vi.stubGlobal("fetch", mockFetchStatus(401));
    client.setActiveQrToken("qr-token");

    await client.get("/menu/categories");

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not notify for other errors such as 403", async () => {
    vi.stubGlobal("fetch", mockFetchStatus(403));
    client.setAuthToken("valid-token");

    await client.get("/locations");

    expect(handler).not.toHaveBeenCalled();
  });

  it("stops notifying after unsubscribe", async () => {
    vi.stubGlobal("fetch", mockFetchStatus(401));
    const other = vi.fn<() => void>();
    const unsubscribe = client.onUnauthorized(other);
    unsubscribe();
    client.setAuthToken("expired-token");

    await client.get("/locations");

    expect(other).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
