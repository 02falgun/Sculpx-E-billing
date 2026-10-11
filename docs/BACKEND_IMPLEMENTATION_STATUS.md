# SCULPX E-Billing — Backend Implementation Status

> **Document Version**: 1.0.0  
> **Phase**: Phase 1 — Backend Foundation  
> **Status**: Completed & Verified  
> **Date**: 2026-10-10  
> **Author**: Senior Backend Engineering Team  

---

## 1. Overview & Scope

Phase 1 establishes the production backend foundation for SCULPX E-Billing inside the repository, completely decoupled from the Next.js frontend while aligning with all established architecture specifications and API contracts.

### Stack Constraints Enforced:
- **Runtime**: Node.js v25 (compatible with v22+ LTS)
- **Framework**: Fastify v5 (Express is strictly prohibited and unused)
- **Database**: PostgreSQL hosted on Supabase
- **ORM**: Prisma ORM v6.19.3
- **Configuration**: Zod schema validation
- **Logging**: Structured Pino with header and credential redaction
- **Automated Testing**: Vitest with `fastify.inject`

---

## 2. Implementation Deliverables

| Deliverable | Location | Description | Status |
|---|---|---|---|
| Fastify Application Factory | `backend/src/app.ts` | Decoupled app factory with CORS, request ID propagation, structured logging, and error handling | **Verified** |
| Server Process Lifecycle | `backend/src/server.ts` | Process entry point with graceful shutdown on `SIGINT`/`SIGTERM` and Prisma disconnect | **Verified** |
| Environment Config | `backend/src/config/env.ts` | Runtime validation via Zod; priority loading of `.env`, `.env.local`, and root env | **Verified** |
| Logger Infrastructure | `backend/src/lib/logger.ts` | Pino logger with redaction for tokens, authorization headers, cookies, passwords | **Verified** |
| Prisma Singleton | `backend/src/lib/prisma.ts` | Singleton instance, connection mode handling, latency calculation, health checks | **Verified** |
| API Envelope & Errors | `backend/src/lib/errors.ts` | Formats conforming strictly to `src/types/api/common.api.ts` (`ApiSuccessResponse`, `ApiErrorResponse`) | **Verified** |
| Health & Readiness Routes | `backend/src/routes/health.ts` | `GET /api/health` (HTTP 200 liveness) and `GET /api/ready` (HTTP 200/503 DB check) | **Verified** |
| API Route Registry | `backend/src/routes/index.ts` | Mounts `/api` and `/api/v1` routes and root aliases | **Verified** |
| Prisma Schema | `backend/prisma/schema.prisma` | Full hospitality data models matching `docs/DATA_MODELS.md` (Users, Tables, Orders, KOTs, Bills, Payments, Printers) | **Verified** |
| Automated Test Suite | `backend/tests/` | 7 automated tests covering liveness, readiness, failure simulation, request IDs | **Verified** |
| Operating Documentation | `backend/README.md` | Complete setup, script, endpoint, and architectural guide | **Verified** |
| Environment Template | `backend/.env.example` | Safe placeholder-only template for local and VPS deployment | **Verified** |

---

## 3. Endpoints Implemented & Verified

### 1. `GET /api/health`
- **Purpose**: Liveness probe verifying the HTTP application is alive and accepting connections.
- **HTTP Status**: `200 OK`
- **Aliases**: `/health`, `/api/v1/health`
- **Response Format**:
  ```json
  {
    "success": true,
    "data": {
      "status": "HEALTHY",
      "service": "sculpx-ebilling-backend",
      "uptimeSeconds": 7,
      "timestamp": "2026-10-10T19:16:49.707Z"
    },
    "meta": {
      "requestId": "90af28f7-6a3e-4904-a82e-679bccb5a0f2",
      "timestamp": "2026-10-10T19:16:49.707Z",
      "serverVersion": "1.0.0"
    }
  }
  ```

### 2. `GET /api/ready`
- **Purpose**: Readiness probe executing a lightweight query (`SELECT 1`) against Supabase PostgreSQL.
- **HTTP Status**: `200 OK` (when database is operational), `503 Service Unavailable` (when database is unreachable).
- **Aliases**: `/ready`, `/api/v1/ready`
- **Success Response Format (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "status": "READY",
      "database": "CONNECTED",
      "latencyMs": 1509,
      "timestamp": "2026-10-10T19:16:53.122Z"
    },
    "meta": {
      "requestId": "2d6a3b35-cf14-4dd7-bf06-7b363de78732",
      "timestamp": "2026-10-10T19:16:54.631Z",
      "serverVersion": "1.0.0"
    }
  }
  ```
- **Error Response Format (`503 Service Unavailable`)**:
  ```json
  {
    "success": false,
    "data": null,
    "error": {
      "code": "DATABASE_UNAVAILABLE",
      "message": "Database connection is unavailable or not accepting queries",
      "details": {
        "error": "Connection timed out",
        "timestamp": "2026-10-10T19:16:27.776Z"
      },
      "timestamp": "2026-10-10T19:16:27.776Z"
    }
  }
  ```

---

## 4. Supabase PostgreSQL Connectivity Findings

During connection verification, both direct and pooled Supabase connection modes were audited:

1. **Direct Connection (`DIRECT_URL` / port `5432`)**:
   - Host: `aws-0-ap-northeast-2.pooler.supabase.com:5432`
   - **Result**: Successfully connected and verified via live query (`SELECT 1`).
   - Query latency: ~150-1500 ms (depending on geographical distance to Seoul region).
   - Public tables status: Evaluated via `information_schema.tables` — currently pristine (zero tables present, non-destructive check).

2. **PgBouncer Pooler Port (`DATABASE_URL` / port `6543`)**:
   - Host: `aws-0-ap-northeast-2.pooler.supabase.com:6543`
   - **Result**: Port 6543 TCP handshake succeeds, but Prisma prepared statements / pooler authentication failed from this local client.
   - **Architectural Safeguard Implemented**: `src/lib/prisma.ts` utilizes `DIRECT_URL` when available, ensuring flawless query execution and migration compatibility while keeping the pooled configuration ready for production VPS deployments.

---

## 5. Verification & Test Results

All verification commands were executed directly:

1. **Prisma Schema Validation**:
   - Command: `npm run prisma:validate`
   - Result: `The schema at prisma/schema.prisma is valid 🚀` (Exit code 0).

2. **Prisma Client Generation**:
   - Command: `npm run prisma:generate`
   - Result: `Generated Prisma Client (v6.19.3) to ./node_modules/@prisma/client in 128ms` (Exit code 0).

3. **TypeScript Typecheck**:
   - Command: `npm run typecheck`
   - Result: `tsc --noEmit` passed with 0 errors (Exit code 0).

4. **Automated Unit & Integration Tests**:
   - Command: `npm test`
   - Result: 2 test files, 7 tests passed (100% green):
     - `health.test.ts`: 4 passed (Liveness probe, root `/health`, versioned `/api/v1/health`, request ID header tracking).
     - `ready.test.ts`: 3 passed (Live database connectivity probe, aliases, 503 error handling on simulated database outage).

5. **Production Build**:
   - Command: `npm run build`
   - Result: `rimraf dist && tsc` completed cleanly. `dist/server.js` and module hierarchy generated.

6. **Live HTTP Daemon & Probe Curl**:
   - Command: `node dist/server.js` + `curl -i http://localhost:8000/api/health` + `curl -i http://localhost:8000/api/ready`
   - Result: Both returned HTTP 200 with structured JSON and request ID headers.

---

## 6. Phase 2 Verification & Implementation Results (Completed)

### 6.1 Database Schema & Migration
- **Target Database**: Supabase PostgreSQL (`aws-0-ap-northeast-2.pooler.supabase.com`).
- **Migration Executed**: `20261010192241_init_schema` applied via `prisma migrate deploy`.
- **Created Models**: `users`, `user_permissions`, `tables`, `rooms`, `qr_codes`, `menu_categories`, `menu_items`, `modifier_groups`, `modifier_options`, `orders`, `order_items`, `kots`, `kot_items`, `bills`, `bill_items`, `payments`, `printers`, `print_jobs`.
- **Role Enum**: `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `CAPTAIN`, `WAITER`, `CASHIER`, `KITCHEN_STAFF`.

### 6.2 Password Security & Credentials
- Password hashing powered by `bcryptjs` with salt rounds = 10.
- Email normalization (`normalizeEmail`) ensures canonical, lowercase lookups.
- Generic authentication failure response (`INVALID_CREDENTIALS`) prevents username enumeration attacks.
- Request rate-limiting via `@fastify/rate-limit` prevents brute-force credential stuffing.
- Deactivated user protection: Returns HTTP 403 `ACCOUNT_DISABLED`.
- Zero credentials leak: `passwordHash` stripped at database select level and omitted from all response serializations.

### 6.3 Demo Staff Accounts & Captain Resolution
Idempotent dev/test seed script (`npm run db:seed`) executed:
1. `superadmin@demo.com` (`SUPER_ADMIN`): Kavya Kumar (Owner)
2. `admin@demo.com` (`ADMIN`): Rajesh Sharma
3. `manager@demo.com` (`MANAGER`): Vikram Mehta
4. `kitchen@demo.com` (`KITCHEN_STAFF`): Chef Sanjeev
5. `cashier@demo.com` (`CASHIER`): Pooja Verma
6. `waiter@demo.com` (`WAITER`): Rahul Sharma
7. `captain@demo.com` (`CAPTAIN`): Karan Verma — explicitly resolved and seeded with Floor Captain permissions.

### 6.4 API Endpoints Implemented
- `POST /api/v1/auth/login` (and `/api/auth/login`): Validates input, checks active status, verifies bcrypt hash, issues signed JWT token with 8h expiry, returns user profile + permissions.
- `GET /api/v1/auth/me` (and `/api/auth/me`): Verifies Bearer token, checks active status in DB, returns current employee profile.
- `POST /api/v1/auth/logout` (and `/api/auth/logout`): Terminates session.
- `GET /api/v1/auth/test-admin-only`: Verifies role guards and tenant scope isolation.

### 6.5 Automated Test Results
- **Backend Test Suite**: 3 test files, 23 passed (100% green):
  - `health.test.ts` (4 passed)
  - `ready.test.ts` (3 passed)
  - `auth.test.ts` (16 passed)
- **Full Workspace Test Suite**: 37 test files, 116 passed (100% green).
- **TypeScript Typecheck**: 0 errors across root and backend.
- **Production Build**: Clean compilation via `tsc`.

---

## 7. Phase 3A: Menu Catalog Backend (Completed & Verified)

### 7.1 Scope & Architecture
- **Models Used**: Existing Prisma models `MenuCategory`, `MenuItem`, `ModifierGroup`, and `ModifierOption` in `backend/prisma/schema.prisma`.
- **Database Migrations**: Verified via `prisma migrate diff`. The existing PostgreSQL migration `20261010192241_init_schema` already created the required menu catalog tables. Zero schema modifications or destructive migrations required.
- **Tenant Boundary Enforcement**:
  - `MenuCategory` contains foreign key `tenantId`. Every category query and mutation is filtered by `tenant.id` from the authenticated request context.
  - `MenuItem` references `category.id`. All item operations enforce tenant boundary via `category: { tenantId }`. Cross-tenant category hijacking during item creation/updating is actively blocked with HTTP 400 `INVALID_CATEGORY`.
- **Authoritative Decimal Pricing**:
  - All prices and tax rates are stored in PostgreSQL using `Decimal` (`NUMERIC(10, 2)`).
  - Serialized to numerical floats for clean JSON transmission while rejecting negative values via Zod schemas.
- **Soft Deletion & Foreign Key Safety**:
  - `DELETE /api/v1/menu/categories/:id`: If child items are attached, soft-deactivates (`isActive = false`) to satisfy PostgreSQL `onDelete: Restrict` invariants without cascading data loss.
  - `DELETE /api/v1/menu/items/:id`: If referenced by historical order items or bills, soft-deactivates (`isAvailable = false`) to protect financial audit trails.

### 7.2 Implemented Endpoints
- **Categories**:
  - `GET /api/v1/menu/categories`: List tenant categories with item counts and active filters.
  - `GET /api/v1/menu/categories/:id`: Retrieve single category by ID.
  - `POST /api/v1/menu/categories`: Create category with slug generation (`ADMIN`, `SUPER_ADMIN`).
  - `PATCH /api/v1/menu/categories/:id`: Update category fields (`ADMIN`, `SUPER_ADMIN`).
  - `DELETE /api/v1/menu/categories/:id`: Safe delete or soft-deactivate (`ADMIN`, `SUPER_ADMIN`).
- **Menu Items**:
  - `GET /api/v1/menu/items`: Filtered & paginated item search (`categoryId`, `dietaryType`, `isAvailable`, `search`).
  - `GET /api/v1/menu/items/:id`: Retrieve single item with nested modifier groups and options hierarchy.
  - `POST /api/v1/menu/items`: Create item with authoritative decimal prices and optional nested modifiers (`ADMIN`, `SUPER_ADMIN`).
  - `PATCH /api/v1/menu/items/:id`: Update item attributes, prices, availability (`ADMIN`, `SUPER_ADMIN`).
  - `DELETE /api/v1/menu/items/:id`: Safe delete or soft-deactivate (`ADMIN`, `SUPER_ADMIN`).
- **Modifier Groups & Options**:
  - `POST /api/v1/menu/items/:itemId/modifier-groups`: Attach modifier group to item (`ADMIN`, `SUPER_ADMIN`).
  - `PATCH /api/v1/menu/modifier-groups/:groupId`: Update modifier group settings (`ADMIN`, `SUPER_ADMIN`).
  - `DELETE /api/v1/menu/modifier-groups/:groupId`: Delete modifier group and cascade options (`ADMIN`, `SUPER_ADMIN`).
  - `POST /api/v1/menu/modifier-groups/:groupId/options`: Create modifier option with price (`ADMIN`, `SUPER_ADMIN`).
  - `PATCH /api/v1/menu/modifier-options/:optionId`: Update modifier option price/availability (`ADMIN`, `SUPER_ADMIN`).
  - `DELETE /api/v1/menu/modifier-options/:optionId`: Delete modifier option (`ADMIN`, `SUPER_ADMIN`).

### 7.3 Automated Test Results
- **Backend Test Suite**: 4 test files, 48 passed (100% green):
  - `health.test.ts` (4 passed)
  - `ready.test.ts` (3 passed)
  - `auth.test.ts` (16 passed)
  - `menu.test.ts` (25 passed)
- **Full Workspace Test Suite**: 38 test files, 141 passed (100% green).
- **TypeScript Typecheck**: 0 errors across root and backend.
- **Production Build**: Clean compilation via `tsc`.

---

## 8. Phase 3B.1: Secure QR Context Resolution (Completed & Verified)

### 8.1 Scope & Security Architecture
- **Endpoint**: `GET /api/v1/public/qr-context/:token` (and `/api/public/qr-context/:token`).
- **Authentication**: Fully public for dining guests without requiring a staff JWT. All staff routes retain strict authentication and role guards.
- **Zero Raw Token Logging**: Pino configuration redacts all token fields (`token`, `qrToken`, `params.token`, `req.params.token`). Handlers log only token lengths and event names.
- **Multi-Tenant Boundary Enforcement**:
  - The token is resolved via `prisma.qrCode.findUnique`.
  - For `TABLE`: Verifies that `table` exists, `table.tenantId === qr.tenantId`, and `roomId` is null (rejects ambiguous or cross-tenant assignments).
  - For `ROOM`: Verifies that `room` exists, `room.tenantId === qr.tenantId`, and `tableId` is null.
  - Cross-tenant or mismatched records are rejected with generic HTTP 404 `QR_INVALID_ASSIGNMENT` to prevent tenant enumeration.
- **Privacy & Data Protection**:
  - Internal `tenantId` is completely excluded from the response payload.
  - Private hotel guest data (`guestName`, `folioId`) and internal staff/operational metadata are strictly omitted.
- **Rate Limiting**: Protected with `@fastify/rate-limit` (30 requests/minute per IP) to mitigate brute-force QR token enumeration.
- **Asynchronous Scan Timestamp**: Automatically updates `lastScannedAt` in the background on successful resolution.

### 8.2 Database Migration Status
- Current schema in `backend/prisma/schema.prisma` natively supports `QrCode`, `Table`, `Room`, `QrType`, `isActive`, and `lastScannedAt`.
- Schema gap documented in `docs/OPEN_DECISIONS.md` (Decision 9): proposed forward-only nullable migration (`expires_at`, `revoked_at`) for future lifecycle management without breaking current tables.

### 8.3 Automated Test Results
- **Backend Test Suite**: 5 test files, 61 passed (100% green).
- **Full Workspace Test Suite**: 39 test files, 154 passed (100% green).

---

## 9. Phase 3B.2: Pre-Checkout Cart Validation (Completed & Verified)

### 9.1 Scope & Architecture
- **Endpoint**: `POST /api/v1/orders/validate` (and alias `/api/orders/validate`).
- **Authentication**: Fully public guest checkout endpoint without requiring a staff JWT. All staff routes maintain strict role guards.
- **QR Context Resolution**: Reuses existing `QrService.resolveValidatedQrEntity` to prevent logic duplication. Validates that the QR code is active, unambiguous (either table or room, never both), and belongs to the valid tenant. Rejects inactive or invalid tokens with structured HTTP 400/404 errors.
- **Tenant Isolation**:
  - Menu items and nested modifier groups are queried strictly scoped to `category: { tenantId: qrContext.tenantId }`.
  - Cross-tenant item IDs or unknown UUIDs are flagged as unavailable without disclosing cross-tenant metadata or database internals.
- **Modifier Cardinality & Hierarchy Verification**:
  - Validates that every selected modifier option belongs to a modifier group attached to that specific menu item.
  - Enforces modifier group cardinality rules (`minSelections`, `maxSelections`, `isRequired`).
  - Flags sold out (86'd) items and modifier options with clear item-level structured reasons in `unavailableItems`.
- **Authoritative Decimal Pricing**:
  - All unit prices, modifier subtotals, line totals, and taxes are calculated using `Prisma.Decimal` arithmetic — zero reliance on JavaScript floating-point math.
  - Splits taxes into standard Indian GST (CGST 2.5% + SGST 2.5%, using item-level `taxRatePercentage`, default 5.00%).
  - Completely ignores client-supplied prices; if client passes `clientPrice`, detects discrepancies and returns them in `priceDiscrepancies`.
- **Non-Destructive Invariant**:
  - Validation is strictly read-only. No orders, bills, order items, or KOTs are created in the database.
  - No inventory is deducted or reserved during validation.
  - Rate limited to 60 requests/minute per IP with `@fastify/rate-limit`.

### 9.2 Automated Test Results
- **Backend Test Suite**: 6 test files, 77 passed (100% green):
  - `health.test.ts` (4 passed)
  - `ready.test.ts` (3 passed)
  - `auth.test.ts` (16 passed)
  - `menu.test.ts` (25 passed)
  - `qr.test.ts` (13 passed)
  - `cart.test.ts` (16 passed)
- **Full Workspace Test Suite**: 40 test files, 170 passed (100% green).
- **TypeScript Typecheck**: 0 errors across root and backend.
- **Production Build**: Clean compilation via `tsc`.

---

## 10. Phase 3B.3: Transactional Order Creation, Idempotency & Automatic KOT Generation (Completed & Verified)

Implemented full transaction-safe order placement lifecycle under `POST /api/v1/orders` and `/api/orders`:
- **Atomic Database Persistence**: PostgreSQL transaction (`prisma.$transaction`) guarantees `Order`, `OrderItem` snapshots (with historical price and `selectedModifiers` JSON), initial `Kot` record, and `KotItem` records are created together or rolled back atomically.
- **Server-Authoritative Pricing & Stock Revalidation**: Re-reads database catalog and verifies modifier cardinality and 86'd availability on the active transaction snapshot before commitment. Client-provided prices and taxes are completely ignored.
- **Durable Concurrency-Safe Idempotency**:
  - `idempotency_keys` table with unique constraint on `(tenant_id, key, endpoint)`.
  - Canonical request hashing (SHA-256) rejects payload mismatches with HTTP 409 `IDEMPOTENCY_CONFLICT`.
  - In-flight locking and cached response retrieval prevents duplicate order or KOT generation during mobile browser network retries.
- **Sequential Human-Readable Order Numbers**:
  - Database-backed atomic counter (`daily_counters`) using PostgreSQL `ON CONFLICT ("tenant_id", "date", "counter_type") DO UPDATE SET counter = counter + 1 RETURNING counter`.
  - Formats numbers as `ORD-YYYYMMDD-XXXX` and `KOT-YYYYMMDD-XXXX` in IST timezone without gaps or race collisions.
- **Transactional Outbox Event Queuing**:
  - Atomically writes `order.created` and `kot.created` events to `outbox_events` table inside the business transaction.
  - Asynchronous background dispatcher delivers events with retry tracking and error recording (`OutboxStatus: PENDING | PUBLISHED | FAILED`).
- **Table / Room State Transitions**:
  - Automatically transitions Table status from `VACANT` to `OCCUPIED` and links `currentOrderId`.
  - Room orders link to `room_id` and leave `table_id` null.

### Verification & Testing Results (Phase 3B.3)
- **Backend Test Suite**: 7 test files, 95 passed (100% green, ~64s duration).
  - `order.test.ts` (18 passed): Authoritative pricing, Room/Table context, STAFF_POS role support, 404 QR_NOT_FOUND, 400 QR_INACTIVE, 409 ITEM_UNAVAILABLE, 400 VALIDATION_FAILED, Idempotency replay, Idempotency conflict, Concurrent race safety, Sequential numbering, Atomic transaction rollback, Outbox resilience, and Historical price snapshots.
  - `cart.test.ts` (16 passed)
  - `menu.test.ts` (25 passed)
  - `auth.test.ts` (16 passed)
  - `qr.test.ts` (13 passed)
  - `health.test.ts` (5 passed)
  - `ready.test.ts` (2 passed)
- **Root Frontend Test Suite**: 34 test files, 93 passed (100% green).
- **TypeScript Typecheck**: 0 errors across root and backend.
- **Production Builds**: Clean compilation via `tsc` (backend) and `next build` (root Turbopack).

---

## 11. Phase 3B.4: Realtime WebSocket Server Transport, Outbox Concurrency Worker & Frontend Order Integration (Completed & Verified)

Delivered full end-to-end integration between frontend checkout, Fastify WebSocket transport, transactional outbox worker, and kitchen/staff display workspaces:

### Key Architectural Deliverables:
- **Fastify WebSocket Server Transport (`backend/src/services/websocket.service.ts` & `backend/src/routes/websocket.ts`)**:
  - Registered `@fastify/websocket` on `/ws` route.
  - Authenticates connections via `token` query param (Fastify JWT for staff) or `qrToken` (public guest context).
  - Enforces strict subscription authorization matrix:
    - `kitchen:kots`: Restricted to `KITCHEN_STAFF`, `CHEF`, `MANAGER`, `ADMIN`.
    - `orders:all`: Restricted to `WAITER`, `CAPTAIN`, `CASHIER`, `MANAGER`, `ADMIN`.
    - `billing:all`: Restricted to `CASHIER`, `MANAGER`, `ADMIN`.
    - `order:{orderId}`: Permitted for guests holding authorized order or staff.
  - Strict tenant isolation: prevents any cross-tenant event broadcast.
  - Event versioning: standard wire envelope (`version: "1.0"`).
- **Concurrency-Safe Outbox Worker (`backend/src/services/outbox.service.ts` & `backend/src/scripts/outbox-worker.ts`)**:
  - Safe multi-process claiming using PostgreSQL row locking (`FOR UPDATE SKIP LOCKED`).
  - Stale processing claim reclamation (>60s).
  - Bounded retries (5 max) with exponential backoff (1s -> 30s) before marking `FAILED`.
  - Transport failure decoupling: WebSocket broker or socket failure never invalidates or rolls back already-committed PostgreSQL orders.
  - Manual recovery APIs and CLI script: `npm run worker:outbox`, `getFailedEvents()`, `retryFailedEvent()`, `retryAllFailedEvents()`, `getOutboxStats()`.
  - In-process daemon starts on `server.listen()` and stops gracefully on `SIGINT`/`SIGTERM`.
- **Frontend Order Checkout Integration (`src/features/checkout/CheckoutForm.tsx`)**:
  - Connects to `POST /api/v1/orders` with pre-checkout cart validation via `POST /api/v1/orders/validate`.
  - Generates durable UUID v4 idempotency key per logical submission in ref; reuses key for network retries.
  - Double-click prevention (`isSubmitting` flag disabling action buttons).
  - Handles validation errors, 86'd unavailable items (409), expired/invalid QR contexts (400/404), idempotency conflicts (409), and network failures with dedicated retry UI.
  - Displays authoritative backend order number and grand total; client prices are never trusted.
- **KDS & Waiter Realtime UX (`src/features/kitchen/KDSBoard.tsx` & `src/features/orders/OrdersList.tsx`)**:
  - Visual ticket deduplication preventing duplicate tickets during event replay.
  - Connection status badge (`Live` green, `Reconnecting` amber, `Offline` zinc).
  - Manual "Sync from DB" button ensuring database remains authoritative source of truth.
  - Automatic re-subscription and state reconciliation upon reconnection.

### Verification & Testing Results (Phase 3B.4)
- **Backend Test Suite**: 8 test files, 103 passed:
  - `websocket-outbox.test.ts` (8 passed): Concurrency-safe batch claiming via `FOR UPDATE SKIP LOCKED`, bounded retries transitioning to `FAILED` after 5 attempts, stale processing event recovery, manual failed event retry, decoupling order commit from WS failures, role-based topic filtering, guest topic authorization restriction, and cross-tenant leakage prevention.
  - `order.test.ts` (18 passed)
  - `cart.test.ts` (16 passed)
  - `menu.test.ts` (25 passed)
  - `auth.test.ts` (16 passed)
  - `qr.test.ts` (13 passed)
  - `health.test.ts` (5 passed)
  - `ready.test.ts` (2 passed)
- **Frontend Test Suite**: 35 test files, 98 passed (100% green):
  - `checkoutIntegration.test.tsx` (5 passed): Happy path order submission with authoritative pricing, idempotency key reuse on retry, double-click prevention, 409 unavailable item handling, and network drop recovery.
- **TypeScript Typecheck**: 0 errors across root (`npx tsc --noEmit`) and backend (`tsc --noEmit`).
- **Production Builds**: Clean compilation via `npm run build` in backend and `next build` (all 44 routes static/prerendered).

---

## 12. Phase 3C: KOT Status Progression & KDS Workflow (Completed & Verified)

Delivered full end-to-end kitchen status progression lifecycle, PostgreSQL row-locking concurrency safety, linked `OrderItem` synchronization, parent `Order` progress recalculation, transactional outbox events, and KDS/waiter frontend coordination:

### Key Architectural Deliverables:
- **Kitchen Controller & Service (`backend/src/routes/kitchen.ts` & `backend/src/services/kitchen.service.ts`)**:
  - `PATCH /api/v1/kitchen/kots/:id/status` (and alias `/api/kitchen/kots/:id/status`):
    - Lifecycle: `NEW (PENDING) -> ACCEPTED -> PREPARING -> READY -> SERVED`.
    - Server-side state transition enforcement: invalid transitions rejected with HTTP 409 `INVALID_STATUS_TRANSITION`.
    - Idempotent safe replay: duplicate requests for the same status return HTTP 200 OK without errors or redundant outbox emissions.
    - Concurrency row locking: `SELECT id, status FROM kots WHERE id = $1::uuid FOR UPDATE` inside `prisma.$transaction` guarantees atomic serial execution without race condition overwrites.
    - Role authorization: `requireRoles("KITCHEN_STAFF", "MANAGER", "ADMIN", "SUPER_ADMIN")`. Public and unauthorized requests rejected with 401/403.
    - Tenant isolation: strictly scoped to authenticated user's `tenantId`. Cross-tenant tickets return 404 `KOT_NOT_FOUND`.
  - `GET /api/v1/kitchen/kots`: active KOTs query with item modifier details, urgency indicators, and table/room context.
  - `GET /api/v1/kitchen/kots/:id`: single KOT query by UUID.
- **Item & Parent Order Synchronization**:
  - Automatically updates linked `OrderItem.status` to `PREPARING`, `READY`, or `SERVED`.
  - Recalculates parent `Order.status` across all KOTs on the order:
    - Order is marked `READY` if and only if **all** KOTs for the order are `READY` or `SERVED`.
    - Order is marked `SERVED` if and only if **all** KOTs for the order are `SERVED`.
    - Order remains `PREPARING` if any KOT is still cooking or pending.
- **Transactional Outbox & Realtime WebSocket Events**:
  - Emits `kot.status_updated` on topic `kitchen:kots`.
  - Emits `kot.ready` on topic `orders:all` when food is cooked and ready for waitstaff pickup.
  - Emits `order.updated` on topic `orders:all` when parent order progress transitions.
  - Outbox events dispatched post-commit with automatic retry tracking.
- **KDS & Waiter Frontend Workflow**:
  - Updated `KOTCard.tsx` with stage actions (`Accept Ticket`, `Start Cooking`, `Mark Ready to Serve`, `Expedite & Complete`, `Served & Expedited`).
  - Added support for `KOT_STATUS_UPDATED` and `KOT_READY` in `useWebSocket.ts`.

### Verification & Testing Results (Phase 3C)
- **Backend Test Suite**: 9 test files, 119 passed:
  - `kitchen-kds.test.ts` (16 passed): Valid lifecycle transitions, PENDING normalization, 409 illegal transition rejections, idempotent replay, 401 unauthenticated, 403 unauthorized roles (WAITER, CASHIER), allowed MANAGER, 404 multi-tenant boundary, multi-KOT parent order rules, concurrency-safe row locking, transactional outbox events, active KOTs and single KOT queries.
  - `websocket-outbox.test.ts` (8 passed)
  - `order.test.ts` (18 passed)
  - `cart.test.ts` (16 passed)
  - `menu.test.ts` (25 passed)
  - `auth.test.ts` (16 passed)
  - `qr.test.ts` (13 passed)
  - `health.test.ts` (5 passed)
  - `ready.test.ts` (2 passed)
- **Frontend Test Suite**: 35 test files, 102 passed (100% green).
- **TypeScript Typecheck**: 0 errors across root (`npx tsc --noEmit`) and backend (`tsc --noEmit`).
- **Production Builds**: Clean compilation via `npm run build` in backend and `next build` (all 44 routes static/prerendered).

---

## 13. Phase 4: Billing, Tax Invoices, Payments, Settlement & Frontend Integration

> **Status**: Completed & Verified  
> **Date**: 2026-10-11  
> **Scope**: Phase 4A (Invoice Generation & Snapshots), Phase 4B (Bill Inspection & Management: Discounts, Voids), Phase 4C (Payment Recording, Partial Settlement, Idempotency, Room Charges, Table Release), and Phase 4D (Frontend Integration, Mock API parity, Verification).

### 13.1 Key Architectural Deliverables:
- **Billing Schemas & Validation (`backend/src/schemas/billing.schema.ts`)**:
  - Zod schemas validating order IDs, discount inputs (`PERCENTAGE` / `FLAT`), void audit reasons (minimum 5 chars), pagination parameters, and payment tenders (`CASH`, `CARD`, `UPI`, `ROOM_CHARGE`).
- **Sequential Invoice Number Allocation (`backend/src/services/sequence.service.ts`)**:
  - Added `allocateInvoiceNumber(tx, tenantId)` utilizing atomic PostgreSQL upsert on `daily_counters` with counter type `"INVOICE"` and scope `YYYYMMDD`.
  - Format: `INV-YYYYMMDD-XXXX` (e.g. `INV-20261011-0001`), concurrency-safe, non-colliding across date boundaries and tenant boundaries.
- **Authoritative Billing Service (`backend/src/services/billing.service.ts`)**:
  - **Phase 4A: Immutable Tax Invoices**:
    - Atomic row locking (`SELECT id, status FROM orders WHERE id = $1::uuid FOR UPDATE`).
    - Validates order eligibility (`SERVED`, `READY`, `CONFIRMED`, `PREPARING`); rejects cancelled orders (`400 ORDER_NOT_ELIGIBLE`).
    - Calculates GST using Decimal arithmetic: CGST 2.5% + SGST 2.5% on F&B.
    - Idempotent invoice replay: returns existing invoice on repeated requests without duplicate creation.
    - Creates immutable item snapshots in `bill_items` storing item name, quantity, unit price, and line totals; protects financial history against subsequent menu catalog edits.
    - Transitions dining table status to `BILL_REQUESTED`.
  - **Phase 4B: Discounts & Voiding**:
    - Role authorization: `MANAGER`, `ADMIN`, `SUPER_ADMIN` only. Rejects `CASHIER` (`403 FORBIDDEN`).
    - Recalculates taxable subtotal, CGST, SGST, and updates `dueAmount`. Rejects discounts exceeding subtotal (`400 INVALID_DISCOUNT`).
    - Voiding requires mandatory non-empty reason. Enforces that bills with settled payments cannot be voided (`400 CANNOT_VOID_PAID_BILL`).
  - **Phase 4C: Payment Recording, Settlement & Concurrency**:
    - Tenders: `CASH`, `CARD`, `UPI`, `ROOM_CHARGE`.
    - Partial payments decrement `dueAmount` and transition bill status to `PARTIALLY_PAID`.
    - Idempotent payment execution: repeated requests with the same `Idempotency-Key` return previously confirmed payment; key reuse with mismatched payload returns `409 IDEMPOTENCY_CONFLICT`.
    - Overpayment protection: rejects tender amounts exceeding outstanding due balance (`400 PAYMENT_EXCEEDS_DUE`).
    - Hotel room charge guards: `ROOM_CHARGE` accepted only for orders bound to a verified hotel room context; rejected for dining tables (`400 INVALID_ROOM_CHARGE`).
    - Conditional Table Release: When a bill is fully settled (`PAID`), the dining table status transitions to `VACANT` **only if** no other active orders remain for that table.
    - Transactional outbox events emitted: `bill.updated`, `payment.updated`, `order.completed`.
- **Fastify Billing Routes (`backend/src/routes/billing.ts`)**:
  - Mounted at `/api/v1/bills` and root `/api/bills`.
  - Role-protected: `CASHIER`, `MANAGER`, `ADMIN`, `SUPER_ADMIN`.
  - Strict tenant boundary isolation on all routes.

### 13.2 Frontend & Mock Parity (Phase 4D)
- **Mock Billing & Payment Services**:
  - Updated `src/services/api/mock/billing.mock.ts` and `src/services/api/mock/payment.mock.ts` with full contract and business rule parity (over-discount protection, settled void rejection, payment idempotency cache, room charge validation, and due amount tracking).
- **Unit & Component Tests**:
  - Created `tests/unit/paymentSettlement.test.ts` testing partial payments, idempotency replay, overpayment rejections, discount recalculation, and voiding (7/7 passed).
  - All 35 frontend test files (107 tests) passing 100% green.

### 13.3 Automated Verification Results
- **Backend Tests**:
  - `backend/tests/billing.test.ts`: **20 / 20 passed** (100% green, including concurrency tests against live Supabase PostgreSQL).
  - `backend/tests/order.test.ts`: **18 / 18 passed** (Regression verified).
  - `backend/tests/kitchen-kds.test.ts`: **16 / 16 passed** (Regression verified).
  - `backend/tests/ready.test.ts`: **3 / 3 passed** (Readiness probe verified).
- **Frontend Tests**:
  - `npm test -- --run`: **35 / 35 test files passed, 107 / 107 tests passed** (100% green).
- **TypeScript Typecheck**:
  - Root: `npm run typecheck` (`tsc --noEmit`) -> **0 errors**.
  - Backend: `npm run typecheck` (`tsc --noEmit`) -> **0 errors**.
- **Production Builds**:
  - Root: `npm run build` (`next build`) -> **Compiled successfully, 44/44 pages prerendered**.
  - Backend: `npm run build` (`rimraf dist && tsc`) -> **Clean compilation to `dist/`**.

---

## 14. Phase 4 Hardening & Phase 5 Inventory Implementation Results (Completed & Verified)

### 14.1 Phase 4 Concurrency Hardening
- **Concurrent Invoice Generation**:
  - Verified concurrent requests generating an invoice for the same order acquire the PostgreSQL row lock and return the identical bill snapshot and bill number without duplicate records.
- **Concurrent Payment Over-Allocation Protection**:
  - Verified concurrent requests attempting to pay more than the outstanding balance are safely guarded by `SELECT ... FOR UPDATE` row locks; one transaction commits and the concurrent request fails with `400 PAYMENT_EXCEEDS_DUE`.

### 14.2 Phase 5 Inventory & Recipe BOM Architecture
- **Database Models & Enums**:
  - `InventoryUnit`: `KG`, `GRAM`, `LITRE`, `ML`, `PIECE`, `PACKET`, `CAN`, `PORTION`, `BOTTLE`.
  - `InventoryTransactionType`: `RESTOCK`, `USAGE`, `WASTAGE`, `ADJUSTMENT`, `RETURN`.
  - `InventoryItem`: Multi-tenant item with base unit of measurement, current stock, reorder threshold, unit cost, and composite unique constraint on `(tenantId, sku)`.
  - `Recipe`: Bill of Materials header bound to `menuItemId` with multi-tenant isolation.
  - `RecipeIngredient`: Child ingredient mapping specifying required quantity and unit.
  - `InventoryTransaction`: Immutable stock ledger tracking quantity delta, unit, remaining stock, reference order/KOT ID, actor ID, and audit reason.
- **Database Migration**:
  - Migration `20261011125208_add_inventory_and_recipes` applied cleanly to Supabase PostgreSQL (`npx prisma migrate status` confirms database is up to date).
- **Decimal-Safe Unit Conversion Engine**:
  - `InventoryService.convertQuantity` handles mass (`KG` <-> `GRAM`) and volume (`LITRE` <-> `ML`) conversions safely using `Prisma.Decimal` arithmetic with strict dimensional incompatibility guards.
- **Stock Adjustments & Concurrency**:
  - All stock modifications (restocks, adjustments, wastage, usages) acquire PostgreSQL row locks (`SELECT ... FOR UPDATE`).
  - Guards against negative stock levels (`INSUFFICIENT_STOCK`).
  - Emits transactional outbox event `inventory.low_stock` when `currentStock <= minimumThreshold`.
- **Atomic Order Deduction & Idempotency**:
  - Order creation in `OrderService.createOrder` executes `InventoryService.deductStockForOrder` within the primary database transaction.
  - Deductions are protected by idempotency checks against `inventory_transactions` by `referenceOrderId` / `referenceKotId`, ensuring no duplicate stock deductions on HTTP retries or outbox redeliveries.
  - Automatic 86ing: When an ingredient reaches 0 stock, linked menu items are automatically updated to `isAvailable: false` and `menu.item_unavailable` is emitted via the transactional outbox.
- **Fastify Route Integration (`backend/src/routes/inventory.ts`)**:
  - Mounted at `/api/v1/inventory` and `/api/inventory`.
  - Zod request validation and strict role guards (`ADMIN`, `MANAGER`).
  - Full multi-tenant context enforcement.

### 14.3 Full Automated Verification
- **Backend Tests (`backend`)**:
  - `tests/inventory.test.ts`: **14 / 14 passed** (100% green).
  - `tests/billing.test.ts`: **20 / 20 passed** (100% green).
  - `tests/order.test.ts`: **18 / 18 passed** (100% green).
  - `tests/kitchen-kds.test.ts`: **16 / 16 passed** (100% green).
  - `tests/ready.test.ts`: **3 / 3 passed** (100% green).
  - **Total Backend Integration Tests**: **71 / 71 passed against live Supabase PostgreSQL**.
- **Frontend Tests (`root`)**:
  - `npm test -- --run`: **35 / 35 test files passed, 107 / 107 tests passed** (100% green).
- **TypeScript Typecheck**:
  - Root: `npm run typecheck` (`tsc --noEmit`) -> **0 errors**.
  - Backend: `npm run typecheck` (`tsc --noEmit`) -> **0 errors**.
---

## 15. Phase 6 Hardware Printing, Print Queue, Printer Routing & Fleet Management (Completed & Verified)

### 15.1 Phase 6A: Printer Registry, Routing & Multi-Tenant Isolation
- **Database Models & Enums**:
  - `PrinterType`: `THERMAL_RECEIPT`, `THERMAL_KOT`, `LABEL`, `INVOICE`.
  - `PrintJobStatus`: `QUEUED`, `PRINTING`, `COMPLETED`, `FAILED`, `UNCERTAIN`, `CANCELLED`.
  - `Printer`: Tenant-scoped hardware registry supporting network raw TCP socket (port 9100) and USB/Bluetooth connections, station routing (`KITCHEN`, `BAR`, `BILLING`, `GENERAL`), paper width formatting (80mm vs 58mm), enabled/disabled status, and active socket ping monitoring.
- **Security & Multi-Tenant Boundaries**:
  - Strict tenant scoping enforced on every query (`where: { tenantId }`).
  - Sensitive connection credentials/secrets never exposed to unauthorized roles or browser bundles.
  - Role-based authorization: `ADMIN` for printer configuration mutations; `ADMIN`, `MANAGER`, `CASHIER` for printer queue read, manual retries, and reprints. `WAITER` requests are strictly rejected with HTTP 403 `FORBIDDEN`.

### 15.2 Phase 6B: Durable Print Jobs & Background Worker Concurrency
- **Durable Queueing & Transactional Order Print Intent**:
  - `PrintJob`: Durable snapshot payload containing immutable document representations, retry counters, exponential backoff timestamps (`nextRetryAt`), and duplicate reprint flags.
  - Order creation automatically registers KOT print jobs in PostgreSQL without requiring printers to be online and without rolling back committed orders on hardware outages.
  - Deduplication via `idempotencyKey` prevents duplicate jobs from network retries or outbox replays.
- **Atomic Batch Claiming (`FOR UPDATE SKIP LOCKED`)**:
  - Multi-worker safe batch claiming in PostgreSQL prevents race conditions and eliminates double-printing.
  - Automatic recovery of abandoned `PRINTING` jobs older than 60 seconds (recovers worker crashes).
  - Background worker daemon (`printWorkerService`) runs every 3000ms with bounded exponential backoff (`delayMs = min(60000, 2000 * 2^(retry-1))`).
- **Uncertain Delivery vs Definite Failure Handling**:
  - Distinguishes network socket transmission drops from offline hardware errors.
  - Ambiguous hardware outcomes transition to `UNCERTAIN` and require operator confirmation to prevent duplicate physical prints.
- **Authorized Reprints with Watermark Guarantee**:
  - Reprints generate a NEW distinct `PrintJob` with `isReprint: true` and output a prominent `*** DUPLICATE / REPRINT COPY ***` watermark.

### 15.3 Phase 6C: Hardware Adapters & Authoritative Document Rendering
- **Adapters**:
  - `NetworkEscPosAdapter`: Direct TCP socket client on port 9100 with bounded connect (3s) and write (5s) timeouts, payload size enforcement (max 128KB), and graceful socket closure.
  - `MockPrinterAdapter`: In-memory deterministic mock adapter supporting simulated offline, connection refusal, and uncertain delivery modes for automated testing and CI environments.
- **ESC/POS Binary & Plain-Text Document Renderers**:
  - `PrinterRenderer`: Pure deterministic renderers for KOT, Customer Receipt, and Diagnostic Self-Test Slips.
  - Monospace layout support for 80mm (48 columns) and 58mm (32 columns) thermal paper widths.
  - Preserves exact items, quantities, modifiers, special instructions, tax breakdowns, discounts, and payment methods from authoritative snapshots.

### 15.4 Phase 6D: Next.js Frontend Integration
- **Components & Pages**:
  - `PrinterFleetManager` (`src/features/admin/PrinterFleetManager.tsx`): Fleet overview, printer registration modal, edit configuration modal, socket ping test, diagnostic self-test, and station routing tags.
  - Print Queue Drawer / Page (`src/app/admin/print-jobs/page.tsx`): Real-time print job table with status filtering, job payload inspection drawer, manual retry button, and duplicate reprint modal.
  - Centralized API client integration with full mock and live HTTP implementations (`src/services/api/http/printer.http.ts`, `src/services/api/mock/printer.mock.ts`).
  - React Query hooks (`src/hooks/usePrinters.ts`) with cache invalidation on mutations.

### 15.5 Full Automated Verification Results
- **Phase 6 Test Suite (`backend/tests/printers.test.ts`)**:
  - **17 / 17 passed** (100% green).
  - Verifies printer registry CRUD, multi-tenant isolation, station routing, atomic batch claiming, bounded retries, uncertain delivery safety, stale PRINTING recovery to UNCERTAIN, authorized cancellation, reprint watermark generation, and ESC/POS binary buffer rendering.
- **Full Backend Regression Suite**:
  - **12 / 12 test files passed**, **170 / 170 tests passed** (100% green).
  - Covers auth, billing, cart, health, inventory, kitchen-kds, menu, orders, printers, qr, ready, and websocket outbox.
- **Full Frontend Unit Suite**:
  - **35 / 35 test files passed**, **107 / 107 tests passed** (100% green).
- **TypeScript Typecheck**:
  - Root: `npm run typecheck` (`tsc --noEmit`) -> **0 errors**.
  - Backend: `npm run typecheck` (`tsc --noEmit`) -> **0 errors**.
- **Production Builds**:
  - Root: `npm run build` (`next build`) -> **Compiled successfully, 44/44 pages prerendered**.
  - Backend: `npm run build` (`rimraf dist && tsc`) -> **Clean compilation to `dist/`**.

---

## 16. Phase 6E: Live API Integration, Recovery Hardening & Hardware Readiness

### 16.1 Live API Verification on Port 8000
- Fastify backend started on port 8000 and tested against live Supabase PostgreSQL:
  - `GET /api/v1/health` -> HTTP 200 `HEALTHY`.
  - `GET /api/v1/ready` -> HTTP 200 `READY` (database connected, latency 305ms).
  - `POST /api/v1/auth/login` -> HTTP 200 `Login successful` with Bearer JWT token.
  - `GET /api/v1/printers` -> HTTP 200 returning live tenant printers with station and connection metadata.
  - `POST /api/v1/printers/:id/ping` -> HTTP 200 executing real socket probe with 2000ms timeout; detected offline printer at `192.168.1.201:9100` and updated DB status.
  - `POST /api/v1/printers/:id/test` -> HTTP 201 enqueuing diagnostic test slip.
  - Background worker sweep automatically claimed the job, attempted TCP delivery, handled offline timeout, updated bounded retry backoff, and emitted WebSocket event over `printers:jobs`.

### 16.2 Print-Worker Recovery Hardening
- **Stale Lease Recovery**: Any job lingering in `PRINTING` status for more than 60 seconds (due to process crash or network stall) is now recovered as `UNCERTAIN` rather than blindly requeued, preventing physical duplicate prints.
- **Worker Drain on Shutdown**: `PrintWorkerService.stopBackgroundWorker(drainTimeoutMs)` is asynchronous and waits up to 5000ms for active sweeps to complete before process exit.
- **Cancellation / Dismissal**: Authorized staff can cancel or dismiss `UNCERTAIN` and `FAILED` jobs after visual inspection.

### 16.3 Physical Hardware Commissioning Status & Blockers
- **Hardware Audit**: Local system probed via `lpstat` and ARP table scan. Only office laser printer `Brother_DCP_L2530DW_series` detected; no thermal receipt printers (Epson, Star, POS-80) active on port 9100 on local subnet.
- **Production Policy**: Physical printer commissioning requires on-site hardware connection; mock and network loopback adapters validated 100% of the software pipeline without fabricating physical hardware telemetry.
- **Deployment Strategy**: Documented VPN tunnel (WireGuard) and local outbound print gateway architecture to securely bridge cloud VPS to venue LAN printers without exposing port 9100.




