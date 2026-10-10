import { ApiResponse } from "@/types";
import { ENV } from "@/config";

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  token?: string;
  timeoutMs?: number;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = ENV.API_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const { params, token, timeoutMs = 15000, headers, ...rest } = options;

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
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(headers as Record<string, string>),
    };

    // Auto-resolve token if not explicitly provided
    const resolvedToken =
      token ||
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

  delete<T>(endpoint: string, options?: Omit<RequestOptions, "method" | "body">) {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export const apiClient = new ApiClient();
