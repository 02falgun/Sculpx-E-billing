# Error Handling & Resilience Strategy

## 1. Multi-Tier Error Architecture

```text
User Action
  ↓
Try / Catch in Hook or Form Handler
  ↓
API Client Interceptor (Normalize error into ApiError envelope)
  ↓
Decision Point:
  ├── Field Error? ──> React Hook Form inline validation message
  ├── Server Rejection (e.g., Sold Out)? ──> Toast alert + UI badge update
  ├── Network Failure? ──> Offline indicator + background retry
  └── Unhandled Component Exception? ──> React Error Boundary fallback view
```

---

## 2. Standardized Error Envelope
All network errors returned to hooks conform to the standardized error shape:
```typescript
export interface AppError {
  code: string;
  message: string;
  status?: number;
  details?: Record<string, unknown>;
}
```

Common error codes:
- `ERR_NETWORK_DISCONNECTED`: Device lost connection.
- `ERR_QR_EXPIRED`: QR token invalid or expired.
- `ERR_ITEM_UNAVAILABLE`: Item or modifier sold out during ordering.
- `ERR_PRICE_CHANGED`: Server catalogue price updated since cart load.
- `ERR_AUTH_EXPIRED`: Staff token expired.

---

## 3. UI Fallback States
1. **Empty States**: Present when menus have no items in a category, cart is empty, or no active KOTs exist. Always provides an actionable primary button (e.g., "Browse Menu", "Clear Filters").
2. **Loading States**: Skeletons that match the target layout geometry rather than generic full-screen spinners, preventing layout shifts.
3. **Error Boundaries**: Next.js `error.tsx` boundary wraps page routes with a friendly recovery screen and a "Try Again" button that triggers `reset()`.
