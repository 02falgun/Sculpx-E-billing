# Backend Integration Guide

## 1. Zero-UI Rewrite Architecture

The application is engineered so that **no UI component, page, or feature hook requires modification** when cutting over from mock services to the live backend.

```mermaid
graph TD
    UIComponent[Feature Component / Custom Hook] --> ServiceFactory[Service Factory Layer]
    
    ServiceFactory -->|NEXT_PUBLIC_USE_MOCK_API=true| MockImpl[Mock Service Implementation<br/>(In-Memory + Realistic Latency)]
    ServiceFactory -->|NEXT_PUBLIC_USE_MOCK_API=false| ApiImpl[Live REST + WS Client<br/>(Hits Real Backend Gateway)]

    MockImpl -.->|Implements| Interface[IServiceContract]
    ApiImpl -.->|Implements| Interface
```

---

## 2. Cutover Checklist (Phase 10)

1. **Verify Backend Health**:
   - Ensure the backend REST service responds with the standardized `ApiResponse<T>` envelope.
   - Confirm backend returns HTTP 400 with `ApiErrorResponse` on validation issues.
2. **Switch Environment Variable**:
   In `.env.production` or runtime environment:
   ```env
   NEXT_PUBLIC_USE_MOCK_API=false
   NEXT_PUBLIC_API_URL=https://api.yourhoteldomain.com/v1
   NEXT_PUBLIC_WS_URL=wss://api.yourhoteldomain.com/ws
   ```
3. **Verify WebSocket Handshake**:
   - Confirm JWT authentication is attached during WebSocket connection upgrade query param or initial auth frame.
4. **Validation Test**:
   - Run end-to-end regression suite via Playwright with live backend environment.
