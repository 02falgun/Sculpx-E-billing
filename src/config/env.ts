export const ENV = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:8000/ws",
  USE_MOCK_API: process.env.NEXT_PUBLIC_USE_MOCK_API !== "false", // default to true
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || "Restro E-Billing & QR Ordering",
  CURRENCY_SYMBOL: process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "₹",
  CURRENCY_CODE: process.env.NEXT_PUBLIC_CURRENCY_CODE || "INR",
} as const;
