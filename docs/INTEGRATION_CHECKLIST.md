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
- [x] **Bill Generation**: `POST /api/v1/bills/order/:id/generate` generates immutable invoice snapshot with CGST + SGST breakdown and sequential `INV-YYYYMMDD-XXXX` numbering (Phase 4A verified).
- [x] **Bill Lookup**: `GET /api/v1/bills/:id` and `GET /api/v1/bills/order/:orderId` return consistent bill details with immutable items and tax breakdown (Phase 4A & 4B verified).
- [x] **Discount Application**: `POST /api/v1/bills/:id/discount` applies flat or percentage discount with authorized manager role and automatic tax recalculation (Phase 4B verified).
- [x] **Voiding**: `POST /api/v1/bills/:id/void` with valid reason voids unpaid invoice with manager audit trail (Phase 4B verified).
- [x] **Payment Recording**: `POST /api/v1/bills/:id/payments` records tender (`CASH`, `CARD`, `UPI`, `ROOM_CHARGE`) with idempotency key deduplication (Phase 4C verified).
- [x] **Partial / Split Settlement**: Multiple payments correctly reduce `dueAmount`; bill moves to `PAID` and order to `COMPLETED` when balance is 0 (Phase 4C verified).
- [x] **Conditional Table Release**: Dining table released to `VACANT` upon bill settlement only if no other active orders remain for that table (Phase 4C verified).
- [x] **Room Charge Validation**: `ROOM_CHARGE` tender accepted only for verified hotel room orders and rejected for dining tables (Phase 4C verified).
- **Acceptance Criteria**: Full billing workflow verified end-to-end with 20 automated integration tests against Supabase PostgreSQL (including concurrent invoice generation and concurrent overpayment race prevention) and 7 mock parity unit tests. Mock mode remains default on frontend (`NEXT_PUBLIC_USE_MOCK_API=true`).

---

### Stage 5: Inventory & Recipe Consumption
- [x] **Inventory Catalog**: `GET /api/v1/inventory/items` loads current stock and threshold parameters with category & low-stock filtering (Phase 5 verified).
- [x] **Automatic BOM Consumption**: Placing/confirming order decreases linked ingredients in `inventory_items` and logs rows in `inventory_transactions` with unique references (Phase 5 verified).
- [x] **Low Stock Alerts**: Dropping below `minimumThreshold` flags `isLowStock = true` and emits transactional outbox event (Phase 5 verified).
- [x] **Stock Adjustments**: `POST /api/v1/inventory/adjustments` logs manual restocking, usage, or wastage with PostgreSQL row-level locks (Phase 5 verified).
- [x] **Recipe Management**: `GET /api/v1/inventory/recipes` and `POST /api/v1/inventory/recipes` map menu items to ingredient bill of materials with multi-tenant isolation (Phase 5 verified).
- [x] **Auto-86 Availability**: Stock depletion to 0 automatically updates menu item `isAvailable: false` (Phase 5 verified).
- [x] **Unit Conversion Engine**: Decimal-safe conversions for mass (`KG` <-> `GRAM`) and volume (`LITRE` <-> `ML`) with dimensional incompatibility protection (Phase 5 verified).
- **Acceptance Criteria**: Full inventory and recipe BOM workflow verified end-to-end with 14 automated integration tests against Supabase PostgreSQL. Order creation consumes raw ingredients atomically with zero risk of duplicate deductions or race conditions.

---

### Stage 6: Hardware Printing & Fleet Management (Phase 6E Live Hardening)
- [x] **Printer Fleet**: `GET /api/v1/printers` lists hardware stations, ping health, and active status with multi-tenant isolation (Phase 6 verified).
- [x] **Print Job Dispatch**: `POST /api/v1/print-jobs` enqueues KOT or customer receipt with idempotency deduplication (Phase 6 verified).
- [x] **Print Retries & Reprints**: `POST /api/v1/print-jobs/:id/retry` triggers controlled re-transmission; `POST /api/v1/print-jobs/:id/reprint` generates duplicate copy with visible watermark (Phase 6 verified).
- [x] **Atomic Batch Claiming**: Background worker claims pending jobs with `FOR UPDATE SKIP LOCKED` and handles uncertain hardware delivery explicitly (Phase 6 verified).
- [x] **Stale Lease Recovery Hardening**: Abandoned `PRINTING` jobs (> 60 seconds) are recovered to `UNCERTAIN` rather than blindly requeued, preventing physical duplicate prints (Phase 6E verified).
- [x] **Worker Graceful Drain**: Process shutdown waits up to 5000ms for in-flight sweeps to complete before closing database connections (Phase 6E verified).
- [x] **ESC/POS & Monospace Document Rendering**: Pure deterministic renderers for KOT, Customer Receipt, and Diagnostic Self-Test Slips for 80mm and 58mm widths (Phase 6 verified).
- [x] **Fleet UI Management**: `PrinterFleetManager` and `/admin/print-jobs` provide live monitoring, ping test, self-test slip dispatch, and job payload inspection (Phase 6 verified).
- [x] **Live Backend API Verified**: Fastify v5 running on port 8000 successfully verified with real login, printer registry, ping timeout detection, test print queuing, worker batch claiming, and WebSocket broadcasting (Phase 6E verified).
- **Acceptance Criteria**: Full printing and fleet management verified end-to-end with 17 automated integration tests against Supabase PostgreSQL and mock adapters (`backend/tests/printers.test.ts`), plus 107 frontend unit/component tests (`npm run test`). Real hardware deployment instructions documented for venue LAN gateways.

---

## 3. Physical Printer Commissioning & Production Blockers

### 3.1 Hardware Commissioning Audit
- **Environment Hardware Scan**: Verified local network and CUPS printer subsystem (`Brother_DCP_L2530DW_series` detected; zero physical ESC/POS thermal receipt printers present on port 9100 on test subnet).
- **Compliance Policy**: As instructed, physical hardware commissioning cannot be fabricated without actual physical hardware on-site. Software layer, binary generation, network timeout classification, and recovery state machines are 100% verified.
- **Physical Commissioning Checklist (To be executed upon on-site hardware connection)**:
  1. [ ] Connect Epson TM-T88VI / Star TSP143III / POS-80 to venue LAN router.
  2. [ ] Assign static private IP (e.g. `192.168.1.200`) and verify TCP port 9100 reachability.
  3. [ ] Register printer in `PrinterFleetManager` under assigned station (`Hot Kitchen`, `Bar`, `Cashier Desk`).
  4. [ ] Dispatch diagnostic self-test slip and verify text alignment, character encoding, and automatic paper cutter.
  5. [ ] Fire real test order and verify KOT typography, modifier grouping, and line formatting.
  6. [ ] Generate bill receipt and verify numerical alignment, GST breakdown, and receipt cut.
  7. [ ] Unplug Ethernet cable during transmission and verify job transitions to `UNCERTAIN` without auto-duplication upon reconnect.

### 3.2 Production Cutover Blockers
Before switching `NEXT_PUBLIC_USE_MOCK_API=false` in production:
1. **Venue Hardware Gateway / VPN**: Deploy either WireGuard site-to-site tunnel or the local Outbound Print Gateway agent at the restaurant venue.
2. **Physical Thermal Printers**: Connect physical ESC/POS hardware at the venue and assign static DHCP reservations.
3. **Production Domain & SSL**: Provision HTTPS/WSS SSL certificates on production domain and configure CORS whitelist for production origins.
4. **JWT Secret Hardening**: Ensure `JWT_SECRET` is set to a cryptographically secure 64-character random string in production `.env`.

