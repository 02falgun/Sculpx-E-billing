/**
 * Resolves the backend REST API base URL with Mixed Content protection.
 */
export function resolveApiBaseUrl(
  configuredUrl: string | undefined = process.env.NEXT_PUBLIC_API_URL,
  clientOrigin?: string
): string {
  let url = (configuredUrl || "").trim();

  if (!url) {
    url = "http://localhost:8000/api/v1";
  }

  // Mixed Content Protection:
  // If the application is served over HTTPS (and target is not localhost/127.0.0.1),
  // upgrade http:// to https:// to prevent browser mixed content blocks.
  const isSecureContext =
    clientOrigin !== undefined
      ? clientOrigin.startsWith("https:")
      : typeof window !== "undefined" && window.location?.protocol === "https:";

  const isLocalhostTarget =
    url.includes("://localhost") || url.includes("://127.0.0.1");

  if (isSecureContext && !isLocalhostTarget && url.startsWith("http://")) {
    url = url.replace(/^http:\/\//i, "https://");
  }

  return url.replace(/\/+$/, "");
}

/**
 * Resolves the WebSocket endpoint URL with automatic protocol & Mixed Content protection.
 */
export function resolveWsBaseUrl(
  configuredWsUrl: string | undefined = process.env.NEXT_PUBLIC_WS_URL,
  apiBaseUrl: string = resolveApiBaseUrl(),
  clientOrigin?: string
): string {
  let url = (configuredWsUrl || "").trim();

  // If no explicit WS_URL is provided, derive from API_URL
  if (!url) {
    try {
      const parsedApi = new URL(apiBaseUrl);
      const isSecureApi = parsedApi.protocol === "https:";
      const wsProtocol = isSecureApi ? "wss:" : "ws:";
      url = `${wsProtocol}//${parsedApi.host}/ws`;
    } catch {
      url = "ws://localhost:8000/ws";
    }
  }

  // Mixed Content Protection:
  const isSecureContext =
    clientOrigin !== undefined
      ? clientOrigin.startsWith("https:")
      : typeof window !== "undefined" && window.location?.protocol === "https:";

  const isLocalhostTarget =
    url.includes("://localhost") || url.includes("://127.0.0.1");

  if (isSecureContext && !isLocalhostTarget && url.startsWith("ws://")) {
    url = url.replace(/^ws:\/\//i, "wss://");
  }

  return url.replace(/\/+$/, "");
}

/**
 * Resolves whether the application should operate with in-memory mock services.
 */
export function resolveUseMockApi(
  configuredFlag: string | undefined = process.env.NEXT_PUBLIC_USE_MOCK_API,
  nodeEnv: string | undefined = process.env.NODE_ENV
): boolean {
  if (configuredFlag !== undefined) {
    return configuredFlag.toLowerCase() === "true" || configuredFlag === "1";
  }
  // Production default is ALWAYS real backend (false)
  if (nodeEnv === "production") {
    return false;
  }
  // Local development fallback
  return true;
}

export const ENV = {
  get API_URL(): string {
    return resolveApiBaseUrl();
  },
  get WS_URL(): string {
    return resolveWsBaseUrl();
  },
  get USE_MOCK_API(): boolean {
    return resolveUseMockApi();
  },
  APP_URL:
    process.env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"),
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "Restro E-Billing & QR Ordering",
  CURRENCY_SYMBOL: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "₹",
  CURRENCY_CODE: process.env.NEXT_PUBLIC_CURRENCY_CODE || "INR",
} as const;
