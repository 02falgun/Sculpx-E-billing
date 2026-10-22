import { ApiResponse } from "@/types";
import { ENV } from "@/config";

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  token?: string;
  timeoutMs?: number;
}

export type UnauthorizedHandler = () => void;

// A 401 from these endpoints means "wrong credentials", not "session expired".
const AUTH_ENDPOINTS_WITHOUT_SESSION = ["auth/login", "auth/logout"];

export class ApiClient {
  private baseUrl: string;
  private authToken: string | null = null;
  private activeQrToken: string | null = null;
  private activeLocationId: string | null = null;
  private activeTenantId: string | null = null;
  private unauthorizedHandlers = new Set<UnauthorizedHandler>();
  private isHandlingUnauthorized = false;

  constructor(baseUrl: string = ENV.API_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  /**
   * Register a callback for when a staff request is rejected with 401
   * (expired, revoked or invalid token). Returns an unsubscribe function.
   */
  onUnauthorized(handler: UnauthorizedHandler): () => void {
    this.unauthorizedHandlers.add(handler);
    return () => {
      this.unauthorizedHandlers.delete(handler);
    };
  }

  private notifyUnauthorized(): void {
    // Several requests usually fail together; handle the burst once.
    if (this.isHandlingUnauthorized) return;
    this.isHandlingUnauthorized = true;
    this.authToken = null;
    this.unauthorizedHandlers.forEach((handler) => handler());
    setTimeout(() => {
      this.isHandlingUnauthorized = false;
    }, 1000);
  }

  setAuthToken(token: string | null): void {
    this.authToken = token;
  }

  getAuthToken(): string | null {
    return this.authToken;
  }

  setActiveLocationId(locationId: string | null): void {
    this.activeLocationId = locationId;
  }

  getActiveLocationId(): string | null {
    return this.activeLocationId;
  }

  setActiveTenantId(tenantId: string | null): void {
    this.activeTenantId = tenantId;
  }

  getActiveTenantId(): string | null {
    return this.activeTenantId;
  }

  setActiveQrToken(token: string | null): void {
    this.activeQrToken = token;
    if (typeof window !== "undefined") {
      try {
        if (token) {
          window.sessionStorage?.setItem("restro_active_qr_token", token);
        } else {
          window.sessionStorage?.removeItem("restro_active_qr_token");
        }
      } catch {}
    }
  }

  getActiveQrToken(): string | null {
    return this.activeQrToken;
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, "");
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { params, token, timeoutMs = 30000, headers, ...rest } = options;

    let url = `${this.baseUrl}/${endpoint.replace(/^\//, "")}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined) {
          searchParams.append(key, String(val));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes("?") ? "&" : "?") + queryString;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const reqHeaders: Record<string, string> = {
      Accept: "application/json",
      ...(headers as Record<string, string>),
    };

    if (rest.body !== undefined) {
      reqHeaders["Content-Type"] = "application/json";
    }

    // Auto-resolve token: explicit option > in-memory authToken > localStorage
    const resolvedToken =
      token ||
      this.authToken ||
      (typeof window !== "undefined"
        ? (() => {
            try {
              const raw = window.localStorage.getItem("restro_staff_auth");
              if (raw) {
                const parsed = JSON.parse(raw);
                return parsed?.state?.session?.token;
              }
            } catch {}
            return undefined;
          })()
        : undefined);

    if (resolvedToken) {
      reqHeaders["Authorization"] = `Bearer ${resolvedToken}`;
    } else {
      const activeQrToken =
        this.activeQrToken ||
        (typeof window !== "undefined"
          ? (() => {
              try {
                return (
                  window.sessionStorage?.getItem("restro_active_qr_token") ||
                  window.localStorage?.getItem("restro_active_qr_token") ||
                  undefined
                );
              } catch {}
              return undefined;
            })()
          : undefined);

      if (activeQrToken) {
        reqHeaders["x-qr-token"] = activeQrToken;
      }
    }

    let activeLocId: string | null | undefined = this.activeLocationId;
    let activeTenId: string | null | undefined = this.activeTenantId;
    if (typeof window !== "undefined" && typeof window.localStorage?.getItem === "function") {
      activeLocId = activeLocId || window.localStorage.getItem("restro_active_location_id");
      activeTenId = activeTenId || window.localStorage.getItem("restro_active_tenant_id");
    }
    if (activeLocId) {
      reqHeaders["x-location-id"] = activeLocId;
    }
    if (activeTenId) {
      reqHeaders["x-target-tenant-id"] = activeTenId;
    }

    try {
      const response = await fetch(url, {
        ...rest,
        headers: reqHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = await response.json().catch(() => null);

      if (!response.ok) {
        const normalizedEndpoint = endpoint.replace(/^\//, "");
        if (
          response.status === 401 &&
          resolvedToken &&
          !AUTH_ENDPOINTS_WITHOUT_SESSION.some((path) => normalizedEndpoint.startsWith(path))
        ) {
          this.notifyUnauthorized();
        }

        return {
          success: false,
          data: null as unknown as T,
          error: {
            code: json?.error?.code || `HTTP_${response.status}`,
            message: json?.error?.message || response.statusText || "Request failed",
            details: json?.error?.details,
          },
        };
      }

      return json as ApiResponse<T>;
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const isAbort = err instanceof Error && err.name === "AbortError";
      return {
        success: false,
        data: null as unknown as T,
        error: {
          code: isAbort ? "REQUEST_TIMEOUT" : "NETWORK_ERROR",
          message: isAbort
            ? "Request timed out. Please check your network connection."
            : "Network error. Unable to reach server.",
        },
      };
    }
  }

  get<T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  post<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  put<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
