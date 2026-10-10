# SCULPX E-Billing — Frontend-to-Backend Architecture & Handover Guide

> **Document Type**: Master Technical Handover Specification  
> **Audience**: Backend Database Architect, Node.js API Engineers, Full-Stack Leads  
> **Frontend Version**: 1.0.0 (Production-Ready Next.js 16.4 App Router)  
> **Target Backend Stack**: Node.js (Express / Fastify / Nest) + PostgreSQL 15+ on VPS  
> **Status**: Comprehensive Handover Package  

---

## 1. Project Purpose & System Architecture

**SCULPX E-Billing** is a mission-critical hospitality point-of-sale (POS), QR-based self-ordering, kitchen order display (KDS), automated billing, and inventory tracking platform designed for fine dining restaurants, multi-station banquet properties, and luxury hotel resorts.

### Architectural Tiers:
```text
┌────────────────────────────────────────────────────────────────────────┐
│                        NEXT.JS 16 FRONTEND (Turbopack)                 │
│                                                                        │
│   [Customer QR Flow]        [Waiter Mobile POS]      [Kitchen KDS]    │
│   /menu/[token]             /staff/pos               /kitchen         │
│                                                                        │
│   [Billing Desk POS]        [Manager Exceptions]     [Admin Hub]      │
│   /cashier                  /manager                 /admin           │
└──────────────────┬─────────────────────────────┬───────────────────────┘
                   │ HTTPS JSON REST API         │ WSS Realtime Event Bus
                   ▼                             ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   NODE.JS + POSTGRESQL BACKEND ON VPS                  │
│                                                                        │
│   • REST Router (/api/v1/*)           • WebSocket Bus (/ws)            │
│   • JWT Auth & RBAC Middleware        • Realtime Event Broadcaster     │
│   • PostgreSQL 15 Database (ACID)     • Hardware Print Queue Spooler   │
│   • Business Invariant Engine         • Redis Session/Idempotency      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Existing Frontend Modules & Route Inventory

The frontend is completely built across 44 Next.js App Router routes:

| Workspace | Route Path | Core Functionality | Status |
|---|---|---|---|
| **Customer QR** | `/menu/[qrToken]` | Category browsing, dietary filtering, modifier selection | Verified UI + Mock/HTTP |
| **Customer QR** | `/menu/table/[tableId]` | Table-specific context resolution and menu loading | Verified UI + Mock/HTTP |
| **Customer QR** | `/menu/room/[roomId]` | In-room dining guest context and ordering | Verified UI + Mock/HTTP |
| **Customer QR** | `/cart` & `/checkout` | Portions review, order placement, instructions | Verified UI + Mock/HTTP |
| **Customer QR** | `/order/[orderId]` | Real-time cooking status timeline and tracker | Verified UI + Mock/HTTP |
| **Customer QR** | `/bill/[billId]` | Digital invoice view, GST breakdown, UPI payment | Verified UI + Mock/HTTP |
| **Staff POS** | `/staff/pos` & `/pos` | Fast table ordering, modifiers modal, quick search | Verified UI + Mock/HTTP |
| **Staff Floor** | `/staff/tables` & `/tables`| Floor layout, occupied vs vacant table statuses | Verified UI + Mock/HTTP |
| **Staff Orders** | `/staff/orders` & `/orders`| Active table tickets, cancellation handling | Verified UI + Mock/HTTP |
| **Kitchen KDS** | `/kitchen` | Active KOT cards, preparation timers, status updates| Verified UI + Mock/HTTP |
| **Cashier POS** | `/cashier` | Unsettled tabs, invoice generator, tender recording| Verified UI + Mock/HTTP |
| **Cashier Bills**| `/cashier/bills` | Historical invoices, tax calculation, refunds | Verified UI + Mock/HTTP |
| **Manager Hub** | `/manager` | Operational velocity, exceptions, shift performance | Verified UI + Mock/HTTP |
| **Admin Hub** | `/admin/menu` | Menu catalog CRUD, pricing, modifier group setup | Verified UI + Mock/HTTP |
| **Admin Hub** | `/admin/tables` & `/rooms` | Physical table capacity, QR code link generation | Verified UI + Mock/HTTP |
| **Admin Hub** | `/admin/inventory` | Raw ingredients, minimum thresholds, reorders | Verified UI + Mock/HTTP |
| **Admin Hub** | `/admin/printers` | Network thermal printer fleet configuration | Verified UI + Mock/HTTP |
| **Admin Hub** | `/admin/users` | Staff employee list, role management, credentials | Verified UI + Mock/HTTP |
| **Admin Hub** | `/admin/reports` | Sales analytics, GST remittance, category metrics | Verified UI + Mock/HTTP |

---

## 3. Current Implementation & Mock-Data Strategy

### Dual-Track Architecture
The frontend features a dual-track service factory (`src/services/api/factory.ts`):
```text
UI Component / Hook ───► Dynamic API Proxy (e.g. orderApi)
                              │
               ┌──────────────┴──────────────┐
               ▼                             ▼
       Mock Implementation           Live HTTP Service
      (src/services/api/mock)       (src/services/api/http)
               │                             │
       In-Memory Database            Live Fetch via ApiClient
        (mockDb.ts)                  (NEXT_PUBLIC_API_URL)
```

- Controlled seamlessly via `NEXT_PUBLIC_USE_MOCK_API`:
  - `true` (Default): Uses self-contained mock services with complete in-memory mock database (`src/mocks/mockDb.ts`) and simulated WebSocket connection. Perfect for offline development, QA review, and demo presentations.
  - `false`: Calls concrete live HTTP services (`src/services/api/http/`) and establishes a real WebSocket connection to `NEXT_PUBLIC_WS_URL`.
- **Zero Component Rewrites**: Hooks and UI components consume `orderApi`, `menuApi`, `billingApi`, etc., through dynamic ES6 proxies. Switching from mock to live backend requires **zero UI changes**.

---

## 4. API & WebSocket Architecture

### 4.1 Shared HTTP Client (`ApiClient`)
Located at `src/services/api/client.ts`:
- Automatic JSON serialization and header attachment (`Content-Type`, `Accept: application/json`).
- Query parameter building (`new URLSearchParams`).
- Request timeout protection via `AbortController` (15,000ms default).
- Automatic Bearer token extraction from `localStorage` (`restro_staff_auth`) and injection:
  ```http
  Authorization: Bearer <token>
  ```
- Standardized error wrapping: Network drops or HTTP 4xx/5xx return structured `ApiResponse<T>` with `{ success: false, error: { code, message } }`. **Failed requests never silently report success.**

### 4.2 Shared WebSocket Manager (`WebSocketManager`)
Located at `src/services/websocket/socket.service.ts`:
- Manages connection lifecycle (`CONNECTING`, `CONNECTED`, `DISCONNECTED`, `RECONNECTING`).
- Exponential reconnection backoff (1s initial, 1.5x backoff, 10 retries maximum).
- Event deduplication using a message ID cache (UUID v4).
- Heartbeat ping/pong (every 30 seconds) to keep VPS reverse proxies active.

---

## 5. Authentication & Role-Based Access Control

The frontend recognizes 7 internal staff roles and 1 public customer track:

| Role Code | Title | Workspace Root | Privileges |
|---|---|---|---|
| `SUPER_ADMIN` | Hotel Owner / Super Admin | `/admin` | Complete system governance, audit logs, billing overrides |
| `ADMIN` | Restaurant General Manager | `/admin` | Menu catalog, pricing, hardware printers, staff creation |
| `MANAGER` | Floor / Shift Manager | `/manager` | Void overrides, exception handling, discount approvals |
| `CAPTAIN` | Floor Captain | `/staff` | Table assignment, VIP guest handling, order dispatch |
| `WAITER` | Waiter / Floor Server | `/staff` | Table status, POS order taking, KOT dispatch, bill request |
| `CASHIER` | Cashier Desk Operator | `/cashier` | Tax invoice generation, payment settlement, refunds |
| `KITCHEN_STAFF`| Kitchen Chef / Expediter | `/kitchen` | KDS preparation status (`ACCEPTED` -> `PREPARING` -> `READY`) |

> [!IMPORTANT]
> The backend MUST independently verify JWT signatures, tenant scoping (`tenant_id`), and role permissions on every endpoint. Client-side route guards (`RoleGuard`) are for user experience only.

---

## 6. Integration Prerequisites for the Backend Developer

Before initiating live integration testing, ensure the following are prepared on the VPS:

1. **Node.js API Server Running**:
   - Listening on internal port (e.g. `8000`).
   - Reverse proxy (Nginx/Caddy) forwarding `https://api.yourdomain.com/api/v1` to Node.js.
2. **WebSocket Upgrade Active**:
   - Reverse proxy configured with `Upgrade $http_upgrade` and `Connection "upgrade"` at `/ws`.
3. **CORS Headers Configured**:
   - `Access-Control-Allow-Origin` allowing frontend domain (e.g. `https://pos.yourdomain.com` and `http://localhost:3000`).
   - `Access-Control-Allow-Credentials: true`.
   - `Access-Control-Allow-Headers: Authorization, Content-Type, Accept, Idempotency-Key`.
4. **PostgreSQL 15 Database Initialized**:
   - Tables created as specified in [`docs/DATA_MODELS.md`](./DATA_MODELS.md).
   - Seed data populated with default menu categories, menu items, tables, and demo staff accounts.

---

## 7. Recommended Integration Roadmap

Follow this phased sequence to minimize debugging complexity:

```text
Stage 1: Foundation (Auth, /health, /auth/login, /auth/me)
   │
Stage 2: Menu Catalog & QR Ordering (/menu/*, /orders/validate, /orders)
   │
Stage 3: Staff & Kitchen Operations (/orders, /kitchen/kots, WebSocket sync)
   │
Stage 4: Billing Desk & Payment Settlement (/bills/*, /payments/*)
   │
Stage 5: Inventory & Recipe BOM (/inventory/*)
   │
Stage 6: Hardware Printing & Administrative Operations (/printers, /print-jobs, /users)
```

Detailed acceptance criteria for every stage are in [`docs/INTEGRATION_CHECKLIST.md`](./INTEGRATION_CHECKLIST.md).

---

## 8. Key Reference Documents

All technical documentation is organized in `docs/`:

1. [**`API_CONTRACTS.md`**](./API_CONTRACTS.md) — Master endpoint matrix, schemas, status codes, and curl examples.
2. [**`DATA_MODELS.md`**](./DATA_MODELS.md) — PostgreSQL ER diagram, entity relationships, and production DDL.
3. [**`BUSINESS_RULES.md`**](./BUSINESS_RULES.md) — Business invariants, state machines, and transaction boundaries.
4. [**`WEBSOCKET_EVENTS.md`**](./WEBSOCKET_EVENTS.md) — Realtime event catalog, payloads, channels, and reconnection rules.
5. [**`ENVIRONMENT_SETUP.md`**](./ENVIRONMENT_SETUP.md) — Local `.env.local` vs production VPS deployment variables.
6. [**`VPS_INTEGRATION.md`**](./VPS_INTEGRATION.md) — Nginx reverse proxy configuration, CORS middleware, and SSL guidelines.
7. [**`OPEN_DECISIONS.md`**](./OPEN_DECISIONS.md) — Unresolved design decisions requiring backend developer sign-off.
8. [**`INTEGRATION_CHECKLIST.md`**](./INTEGRATION_CHECKLIST.md) — Stage-by-stage acceptance criteria and verification checklist.

---

## 9. Current Verification Baseline

- **TypeScript Compilation**: `npm run typecheck` — **100% Pass (0 Errors)**
- **ESLint Code Quality**: `npm run lint` — **100% Pass (0 Warnings)**
- **Automated Tests**: `npm run test` (Vitest) — **34 Test Files / 93 Tests Passing**
- **Production Build**: `npm run build` — **44 Routes Generated Cleanly**
