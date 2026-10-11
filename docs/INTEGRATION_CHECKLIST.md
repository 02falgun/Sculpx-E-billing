# SCULPX E-Billing — Frontend & Backend Integration Checklist

> **Document Type**: Actionable Quality & Integration Acceptance Checklist  
> **Audience**: Frontend Engineer, Backend Developer, QA Lead, DevOps  
> **Status**: Comprehensive Stage-by-Stage Verification Guide  

---

## 1. Pre-Integration Verification (Frontend Baseline)

All items below have been verified directly against the frontend codebase and must remain green:

- [x] **Zero TypeScript Errors**: `npm run typecheck` (`tsc --noEmit`) passes with 0 errors.
- [x] **Zero Linter Warnings**: `npm run lint` (`eslint .`) passes cleanly.
- [x] **Unit & Component Tests Passing**: 34 test files (93 tests) passing with 100% green status (`npm run test`).
- [x] **Production Bundle Generates**: `npm run build` (`next build`) compiles all 44 routes without errors.
- [x] **Mock Mode Fully Usable**: Setting `NEXT_PUBLIC_USE_MOCK_API=true` allows full interactive demo across Customer, Waiter, Kitchen, Cashier, Manager, and Admin workspaces.
- [x] **Environment Configuration Isolated**: `.env.example` provided; `.env.local` untracked in git; no credentials or private keys in client code.

---

## 2. Stage-by-Stage Integration Verification Checklist

### Stage 1: Foundation (Auth, Session, Outlet Context)
- [x] **VPS / Local Connectivity**: Fastify v5 server running with configurable `PORT`, `HOST`, and `CORS_ORIGIN`.
- [x] **Health Check**: `GET /health`, `/api/health`, `/ready`, `/api/ready`, `/api/v1/health`, `/api/v1/ready` verified.
- [x] **CORS Verified**: Fastify CORS configured for origin, credentials, and exposed headers (`x-request-id`).
- [x] **Staff Login**: `POST /api/v1/auth/login` validates credentials with bcrypt, checks active status, and returns `{ user, token, expiresAt }`.
- [x] **Token Attachment**: Frontend `ApiClient` auto-attaches `Authorization: Bearer <token>` from localStorage state.
- [x] **Session Re-Check**: `GET /api/v1/auth/me` validates Bearer token and returns authenticated user profile and permissions from DB.
- [x] **Role Protection**: Server-side role guards (`requireRoles`, `requirePermissions`, `requireTenantScope`) enforce HTTP 403 Forbidden.
- [x] **Logout**: `POST /api/v1/auth/logout` terminates session and returns success envelope.
- [x] **Database Schema & Seed**: PostgreSQL migration applied; idempotent demo seeding (`superadmin`, `admin`, `manager`, `kitchen`, `cashier`, `waiter`, and `captain`) verified.
- **Acceptance Criteria**: Staff user authentication, role enforcement, and token lifecycle verified server-side with 23 passing tests. Mock mode remains default on frontend until full end-to-end stage verification.

---

### Stage 2: Menu Catalog & Customer QR Ordering
- [x] **QR Token Resolution**: `GET /api/v1/public/qr-context/:token` resolves valid table or room context with multi-tenant boundary checks, zero PII leakage, and rate limiting (Phase 3B.1 verified).
- [x] **Menu Categories**: `GET /api/v1/menu/categories` returns active category list with item counts, slug support, and tenant isolation (Phase 3A verified).
- [x] **Menu Items**: `GET /api/v1/menu/items` returns items with decimal prices, tax rates, dietary tags, and modifier groups (Phase 3A verified).
- [x] **Search & Filter**: Query params (`categoryId`, `dietaryType`, `isAvailable`, `search`) and pagination filter items correctly (Phase 3A verified).
- [x] **Menu CRUD Operations**: Category, Menu Item, Modifier Group & Option creation/update/safe-deletion guarded by `ADMIN`/`SUPER_ADMIN` (Phase 3A verified).
- [x] **Order Creation**: `POST /api/v1/orders` creates an order in `CONFIRMED` state; returns `ORD-YYYYMMDD-XXXX` order number and initial KOT ticket (Phase 3B.3 & 3B.4 frontend integration verified).
- [x] **Idempotency Verified**: Re-transmitting order with identical `Idempotency-Key` returns cached order without creating duplicate rows, rejecting payload mismatches with 409 (Phase 3B.3 & 3B.4 verified).
- [x] **Order Tracking**: `GET /api/v1/orders/:id` displays live timeline on `/order/[orderId]` (Phase 3B.4 verified).
- **Acceptance Criteria**: Staff manage menu catalog securely on backend; frontend checkout integrated with single UUID idempotency key, double-click protection, authoritative pricing, and retry resilience.

---

### Stage 3: Staff & Kitchen Operations (KDS & Realtime)
- [x] **Staff Order List**: `GET /api/v1/orders` lists active orders filtered by status or table with live WebSocket updates and deduplication.
- [x] **KOT Auto-Generation**: Order placement fires `kot.created` WebSocket event via transactional outbox.
- [x] **KOT Status Progression**: `PATCH /api/v1/kitchen/kots/:id/status` moves ticket through `NEW/PENDING` -> `ACCEPTED` -> `PREPARING` -> `READY` -> `SERVED` with row locking and idempotent safe replay (Phase 3C verified).
- [x] **Order Sync**: Updating KOT tickets to `PREPARING`, `READY`, or `SERVED` updates corresponding OrderItems and parent Order progress in real time (Phase 3C verified).
- [x] **Realtime WebSocket Bus**: Waiter screen (`orders:all`), kitchen display (`kitchen:kots`), and guest view (`order:{orderId}`) update within 500ms of status changes without page refresh.
- [x] **Disconnection Recovery**: Reconnecting after network drop automatically resynchronizes state without duplicate cards.
- **Acceptance Criteria**: Waiter submits order on POS; kitchen KDS displays new card instantly; chef taps "Accept", "Start Cooking", "Mark Ready", and floor staff receive instant ready notifications.

---

### Stage 4: Billing Desk & Payment Settlement
- [ ] **Bill Generation**: `POST /api/v1/bills/order/:id/generate` generates immutable invoice snapshot with CGST + SGST breakdown.
- [ ] **Bill Lookup**: `GET /api/v1/bills/:id` and `GET /api/v1/bills/order/:orderId` return consistent bill details.
- [ ] **Discount Application**: `POST /api/v1/bills/:id/discount` applies flat or percentage discount with authorized staff ID.
- [ ] **Payment Recording**: `POST /api/v1/bills/:id/payments` records tender (`CASH`, `CARD`, `UPI`, `ROOM_CHARGE`).
- [ ] **Partial / Split Settlement**: Multiple payments correctly reduce `dueAmount`; bill moves to `PAID` when balance is 0.
- [ ] **Voiding**: `POST /api/v1/bills/:id/void` with valid reason voids invoice and releases table state.
- [ ] **Refunds**: `POST /api/v1/payments/:id/refund` records refund against settled transaction.
- **Acceptance Criteria**: Cashier views open tab on `/cashier`, generates bill, applies 10% courtesy discount, settles via UPI, and generates paid receipt.

---

### Stage 5: Inventory & Recipe Consumption
- [ ] **Inventory Catalog**: `GET /api/v1/inventory/items` loads current stock and threshold parameters.
- [ ] **Automatic BOM Consumption**: Placing/confirming order decreases linked ingredients in `inventory_items` and logs rows in `inventory_transactions`.
- [ ] **Low Stock Alerts**: Dropping below `minimumThreshold` flags `isLowStock = true` and emits alert.
- [ ] **Stock Adjustments**: `POST /api/v1/inventory/adjustments` logs manual restocking, usage, or wastage.
- [ ] **Recipe Management**: `GET /api/v1/inventory/recipes` maps menu items to ingredient bill of materials.
- **Acceptance Criteria**: Cooking 5 portions of Paneer Tikka automatically reduces paneer stock by 1.0 kg in PostgreSQL.

---

### Stage 6: Hardware Printing & Administrative Operations
- [ ] **Printer Fleet**: `GET /api/v1/printers` lists hardware stations and ping health.
- [ ] **Print Job Dispatch**: `POST /api/v1/print-jobs` enqueues KOT or customer receipt.
- [ ] **Print Retries**: `POST /api/v1/print-jobs/:id/retry` triggers re-transmission to physical printer.
- [ ] **Staff User Administration**: `GET /api/v1/users`, `POST /api/v1/users`, and `PATCH /api/v1/users/:id/role` function with `ADMIN` privileges.
- [ ] **Table & Room Status**: Status patches (`OCCUPIED`, `AVAILABLE`, `RESERVED`) sync properly across floor maps.
- **Acceptance Criteria**: Enqueued print job records status change from `PENDING` to `COMPLETED` when acknowledged by hardware agent.

---

## 3. Production Deployment Sign-Off Criteria

Before cutting over production traffic from mock mode to live backend:

1. **Security**:
   - [ ] No database credentials, secret keys, or private salts exposed in client assets.
   - [ ] Backend strictly enforces role permissions independently of frontend navigation.
   - [ ] CORS whitelists only the production frontend origin.
2. **Reliability**:
   - [ ] `NEXT_PUBLIC_USE_MOCK_API=false` configured in production environment variables.
   - [ ] Failed API requests display clear error banners; never falsely report successful transactions.
   - [ ] WebSocket client automatically handles disconnects and server restarts gracefully.
3. **Data Integrity**:
   - [ ] Order prices and taxes are calculated exclusively on the backend.
   - [ ] Financial rounding adheres to Indian accounting conventions.
