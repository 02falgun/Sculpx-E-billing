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

## 10. Next Immediate Task: Phase 3B.3

**Phase 3B.3: Transactional Order Creation with Idempotency & Automatic KOT Generation (`POST /api/v1/orders`)**
1. Re-validate cart against database snapshot inside an atomic Prisma transaction (`$transaction`).
2. Deduplicate requests using client `Idempotency-Key` header with in-flight locking and cached response storage.
3. Generate human-readable sequential order numbers (`ORD-YYYYMMDD-XXXX`).
4. Atomically persist `Order`, `OrderItem`, and dispatch initial Kitchen Order Tickets (`KOT`).
5. Emit real-time WebSocket events (`order.created`, `kot.created`) to kitchen and staff displays.


