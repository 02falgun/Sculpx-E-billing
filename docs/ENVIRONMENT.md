# Environment Configuration

## 1. Environment Variables Matrix

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | string | `http://localhost:8000/api/v1` | Base REST API endpoint URL |
| `NEXT_PUBLIC_WS_URL` | string | `ws://localhost:8000/ws` | WebSocket gateway endpoint |
| `NEXT_PUBLIC_USE_MOCK_API` | boolean | `true` | When `true`, delegates to in-memory mock services; when `false`, hits live backend |
| `NEXT_PUBLIC_APP_NAME` | string | `Restro E-Billing & QR Ordering` | Customer-facing hotel restaurant brand name |
| `NEXT_PUBLIC_CURRENCY_SYMBOL`| string | `₹` | Local currency symbol for formatted price tags |
| `NEXT_PUBLIC_CURRENCY_CODE` | string | `INR` | Standard ISO currency code |

---

## 2. Configuration Access Pattern
Always consume environment variables through the validated `@/config/env` module rather than raw `process.env.*`:

```typescript
import { ENV } from "@/config/env";

const apiUrl = ENV.API_URL;
const isMock = ENV.USE_MOCK_API;
```
