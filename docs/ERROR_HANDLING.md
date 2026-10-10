# SCULPX E-Billing — Error Handling & Validation Standards

> **Audience**: Frontend Engineers, Backend API Designers, QA Engineers  
> **Topic**: Error Envelopes, HTTP Status Codes, UI Toasts, Idempotency, Fallbacks  

---

## 1. Unified API Error Envelope

All 4xx and 5xx API responses from the backend adhere to the standardized error contract:

```typescript
interface ApiErrorResponse {
  success: false;
  data: null;
  error: {
    code: string;       // Machine-readable error code (e.g. "ITEM_OUT_OF_STOCK")
    message: string;    // User-friendly localized message for UI presentation
    details?: unknown;  // Optional structured validation field errors or metadata
    timestamp?: string; // ISO 8601 UTC timestamp
  };
}
```

---

## 2. Standard Error Catalog & UI Behaviors

| Error Code | HTTP Status | Scenario | Frontend UI Handling |
|---|---|---|---|
| `NETWORK_ERROR` | Client | Fetch failed, internet drop, DNS resolution failure | Renders subtle persistent connectivity warning; retries background query. |
| `REQUEST_TIMEOUT` | Client | API call took > 15,000ms | Displays toast: *"Request timed out. Please check your connection."* |
| `VALIDATION_FAILED` | `400 Bad Request` | Zod schema validation failure on request payload | Highlights specific input fields in red with backend error messages. |
| `UNAUTHORIZED` | `401 Unauthorized` | Missing, expired, or invalid JWT token | Clears local session, displays *"Session expired"*, redirects to `/login`. |
| `FORBIDDEN` | `403 Forbidden` | User role lacks permission for this endpoint | Renders `RoleGuard` restricted station modal with user default route button. |
| `NOT_FOUND` | `404 Not Found` | Entity ID or QR token does not exist | Renders `EmptyState` component with navigation recovery button. |
| `INVALID_QR_TOKEN` | `404 Not Found` | QR code scanned does not exist | Explains table QR is unrecognized; invites guest to call waiter. |
| `QR_DEACTIVATED` | `410 Gone` | Table/room is currently deactivated or closed | Displays friendly station maintenance banner. |
| `ITEM_OUT_OF_STOCK` | `409 Conflict` | Ingredient stock depleted during order checkout | Flags out-of-stock items in cart drawer; prompts diner to adjust items. |
| `ORDER_ALREADY_PREPARING` | `409 Conflict` | Customer attempted cancel after cooking started | Notifies guest that meal is already in preparation pan; offers waiter call. |
| `PAYMENT_FAILED` | `402 / 400` | Card declined or UPI gateway callback timeout | Keeps bill intact, presents error details, prompts alternate payment method. |
| `PRINTER_OFFLINE` | `503 Service Unavailable` | ESC/POS printer disconnected or out of paper | Marks job `FAILED`, queues retry, alerts administrator dashboard. |
| `INTERNAL_SERVER_ERROR` | `500 Server Error` | Uncaught server exception or database error | Displays toast: *"Server error. Our team has been alerted."* Logs error id. |

---

## 3. Idempotency & Duplicate Submission Safeguards

To prevent double billing or duplicate kitchen tickets when network latency causes users to click multiple times:

1. **Client Submission Shielding**:
   - All submit buttons disable immediately on click with loading spinner (`isLoading={isPending}`).
2. **`Idempotency-Key` Header**:
   - Mutating requests (`POST /orders`, `POST /bills/:id/payments`, `POST /orders/:id/cancel`) include a UUID in the `Idempotency-Key` header.
   - If the backend receives a duplicate key within 10 minutes, it returns the cached original response without re-executing business logic.

---

## 4. Real-Time WebSocket Disconnection Handling

Implemented in `src/services/websocket/socket.service.ts`:
- On `onclose` or `onerror`, state transitions to `RECONNECTING`.
- Exponential backoff algorithm automatically schedules reconnections:
  $$\text{Delay} = \min(1000 \times 1.5^{\text{attempts}}, 30000) + \text{jitter}$$
- During disconnection, TanStack Query background polling continues fetching state, ensuring zero frozen UI screens.
