# SCULPX E-Billing — Open Architecture & Integration Decisions

> **Document Type**: Architecture Review & Backend Sign-Off Register  
> **Audience**: Backend Developer, Lead Architect, Product Owner  
> **Status**: Pending Formal Review & Agreement  

---

## 1. Executive Summary

This document catalogues all architectural, security, and data workflow decisions that require explicit mutual agreement between the Frontend team and the Backend Node.js + PostgreSQL engineer.

Each decision includes context, why it matters, a reasoned recommended default, alternatives, current status, and the responsible owner.

---

## 2. Open Decisions Register

### Decision 1: Authentication Strategy (Bearer Token vs. HttpOnly Cookie)
- **Why It Matters**: Affects how tokens are stored, transmitted, CSRF vulnerability profile, cross-domain cookies across subdomains (e.g. `pos.domain.com` vs `api.domain.com`), and mobile PWA offline support.
- **Suggested Default**: **Bearer JWT in `Authorization` Header**.
  - *Rationale*: Cleanest architecture for cross-domain decoupling (Vercel frontend domain calling VPS API subdomain); zero CSRF exposure; straightforward WebSocket connection passing (`?token=...`); already wired into `ApiClient` and `WebSocketManager`.
- **Alternatives**:
  - *Option B*: `HttpOnly` Secure SameSite Session Cookie. Requires custom reverse proxy or matching root domain cookie scope; requires CSRF double-submit token headers on mutating endpoints.
- **Status**: `PENDING BACKEND AGREEMENT`
- **Responsible Person**: Backend Security Architect / Lead Developer

---

### Decision 2: QR Token Lifecycle & Table Spoofing Prevention
- **Why It Matters**: Prevents malicious guests from editing browser URL paths (e.g. changing Table 01 to Table 08) or submitting orders to occupied tables from outside the venue.
- **Suggested Default**: **Dual-Layer Ephemeral Session Token**.
  - Physical QR contains opaque code (`/menu/tbl-01-a9f2`). Scanning calls `GET /api/v1/public/qr-context/:token`, which issues a cryptographically signed guest session JWT in the response payload. Subsequent order submissions attach this session token.
- **Alternatives**:
  - *Option B*: Purely static table IDs in URLs with floor waiter manual POS approval required for all orders before kitchen dispatch.
- **Status**: `PENDING BACKEND AGREEMENT`
- **Responsible Person**: Backend Developer & Product Owner

---

### Decision 3: Recipe Bill of Materials (BOM) Stock Deduction Trigger
- **Why It Matters**: Determines when raw ingredients (flour, paneer, oil, spices) are deducted from `inventory_items` and how cancellations affect inventory accuracy and wastage metrics.
- **Adopted Policy**: **Deduct on Order Confirmation / KOT Creation (`KOT_CREATED`) inside the Database Transaction**.
  - *Rationale*: Kitchen immediately begins using stock once ticket is fired. Stock deduction is executed atomically inside `OrderService.createOrder` transaction via `InventoryService.deductStockForOrder`.
  - *Idempotency*: Re-evaluations, network retries, or duplicate outbox runs check existing `inventory_transactions` by `referenceOrderId` / `referenceKotId` to prevent duplicate deductions.
  - *Insufficient Stock Policy*: Orders are rejected with HTTP 400 `INSUFFICIENT_STOCK` if required stock cannot be fulfilled. If stock reaches zero, `menu_items.is_available` is automatically updated to `false` (Auto-86).
  - *Unit Conversion*: Authoritative mass (`KG` <-> `GRAM`) and volume (`LITRE` <-> `ML`) conversions are performed using Decimal arithmetic with dimension-incompatibility guards.
- **Status**: `AGREED, IMPLEMENTED & VERIFIED IN PHASE 5`
- **Responsible Person**: Backend Database Architect & Kitchen Ops Lead

---

### Decision 4: Kitchen Station Splitting (Unified vs. Multi-KOT)
- **Why It Matters**: Determines whether the backend breaks a single customer order into separate KOT tickets per kitchen station (e.g., Tandoor, Curry, Bar, Bakery) or outputs a single unified KOT.
- **Suggested Default**: **Single KOT per Order Dispatch with Station Tagging per Item**.
  - *Rationale*: Matches frontend KDS cards and physical receipt printing cleanly while allowing station-specific filtering on KDS UI via item tags.
- **Alternatives**:
  - *Option B*: Backend splits order into distinct `kots` rows (`KOT-Bar-01`, `KOT-Kitchen-01`).
- **Status**: `PENDING BACKEND AGREEMENT`
- **Responsible Person**: Backend Developer & Kitchen Ops Lead

---

### Decision 5: PMS Room Charge Integration Method
- **Why It Matters**: Hotel guests ordering via Room QR need to post charges to their room invoice folio (`ROOM_CHARGE` payment method).
- **Suggested Default**: **Mocked in Initial Live Testing; REST Webhook Adapter in Production**.
  - *Rationale*: Allows full POS-to-billing testing without blocking on external PMS vendor credentials (Opera, IDS Next, eZee).
- **Alternatives**:
  - *Option B*: Real-time synchronous PMS API call on payment click. *Drawback*: Blocks cashier/guest if third-party PMS is offline.
- **Status**: `PENDING BACKEND AGREEMENT`
- **Responsible Person**: Backend Developer & Hospitality Systems Integrator

---

### Decision 6: Physical Thermal Printing Architecture
- **Why It Matters**: Web browsers cannot directly communicate with local ESC/POS network thermal printers via raw TCP socket (port 9100) due to browser sandbox restrictions.
- **Implemented Architecture in Phase 6**: **Backend Queue with FOR UPDATE SKIP LOCKED Concurrency & Network ESC/POS Adapter**.
  - All print requests (KOTs, Bill Receipts, Reprints) are transactionally queued in PostgreSQL `print_jobs` table with durable snapshots.
  - A background worker (`printWorkerService`) claims batches atomically using PostgreSQL `FOR UPDATE SKIP LOCKED`.
  - The worker dispatches ESC/POS binary buffers directly over raw TCP sockets (`NetworkEscPosAdapter` on port 9100) with bounded connect/write timeouts and uncertain-delivery detection, or via `MockPrinterAdapter` for test/mock modes.
  - Ambiguous hardware outcomes transition to `UNCERTAIN` and require operator confirmation to prevent duplicate physical prints.
  - Reprints generate new distinct jobs marked with `isReprint: true` and a visible `*** DUPLICATE / REPRINT COPY ***` watermark.
- **Status**: `IMPLEMENTED & VERIFIED IN PHASE 6`
- **Responsible Person**: Senior Backend Engineer & Hardware Integration Lead

---

### Decision 7: Multi-Tenant and Outlet Scoping
- **Why It Matters**: Ensures future multi-branch or multi-property scalability, data isolation, and query safety in PostgreSQL.
- **Suggested Default**: **Mandatory `tenant_id` (and optional `outlet_id`) on all PostgreSQL tables**.
  - Every SQL query enforces `WHERE tenant_id = :current_tenant_id` derived directly from verified JWT claims.
- **Alternatives**:
  - *Option B*: Single-property deployment hardcoded for Phase 1. *Drawback*: Requires extensive schema refactoring later.
- **Status**: `PENDING BACKEND AGREEMENT`
- **Responsible Person**: Backend Database Architect

---

### Decision 8: GST and Discretionary Service Charge Computation
- **Why It Matters**: Compliance with Indian hospitality tax regulations.
- **Suggested Default**:
  - CGST: 2.5% on food & beverage
  - SGST: 2.5% on food & beverage
  - Discretionary Service Charge: 5.0% (Enabled by default; waivable by Cashier/Manager).
  - Rounding: Standard half-up round off to nearest integer ₹1.00.
- **Alternatives**:
  - *Option B*: Zero service charge; pure GST only.
- **Status**: `PENDING BACKEND AGREEMENT`
- **Responsible Person**: Finance / Accounts Lead & Backend Developer

---

### Decision 9: QR Code Expiry, Revocation, and Dynamic Session Token Schema Support
- **Why It Matters**: Phase 3B.1 resolves QR codes using the existing `qr_codes` table. The current schema contains `is_active` (`Boolean`), `last_scanned_at` (`DateTime?`), and `token` (`VarChar(100)`), but lacks explicit `expires_at` (`DateTime?`), `revoked_at` (`DateTime?`), or ephemeral session secret fields.
- **Current Behavior in Phase 3B.1**: `is_active = true` is strictly verified. When inactive, requests are rejected with HTTP 400 `QR_INACTIVE`. Dynamic expiry and revocation checks are safely guarded in application code so they activate automatically once columns are added.
- **Proposed Safe Migration**: A forward-only, non-breaking PostgreSQL migration:
  ```sql
  ALTER TABLE "qr_codes" 
    ADD COLUMN "expires_at" TIMESTAMPTZ(6),
    ADD COLUMN "revoked_at" TIMESTAMPTZ(6);
  CREATE INDEX IF NOT EXISTS "qr_codes_expires_at_idx" ON "qr_codes"("expires_at");
  ```
- **Status**: `DOCUMENTED GAP — PENDING MIGRATION APPROVAL`
- **Responsible Person**: Senior Backend Engineer & Database Architect

---

### Decision 10: Table / Room Status Restrictions during Cart Validation vs Order Creation
- **Why It Matters**: In hospitality dining, customers scan table QR codes and review their carts repeatedly. Tables may be `VACANT` (first order), `OCCUPIED` (repeat ordering / adding courses to open tab), or `RESERVED`. Hotel rooms may similarly be occupied by checked-in guests.
- **Current Behavior in Phase 3B.2**: Pre-checkout cart validation does not reject requests based on `table.status` or `room.status`, nor does it lock inventory, reserve stock, or change table state. Cart validation is strictly read-only and non-destructive. Order creation (Phase 3B.3) will govern whether an order opens a new order or appends to an active tab (`currentOrderId`).
- **Status**: `DOCUMENTED POLICY — CART VALIDATION IS NON-DESTRUCTIVE & READ-ONLY`
- **Responsible Person**: Senior Backend Engineer & Hospitality Operations Lead

---

### Decision 11: Idempotency Key Scoping & Concurrency Strategy
- **Why It Matters**: Prevents duplicate order creation and billing anomalies caused by network timeouts, mobile reconnects, or rapid double-clicking by guests/staff.
- **Implemented Strategy in Phase 3B.3**: Database-backed durable idempotency via `idempotency_keys` table scoped by `(tenant_id, key, endpoint)` with a PostgreSQL unique constraint. Stores a canonical SHA-256 digest of the request body. If a matching key and digest exist, returns the cached response with `X-Cache: HIT`. If the key is reused with a different request payload, immediately rejects with HTTP 409 `IDEMPOTENCY_CONFLICT`. Concurrency is protected via PostgreSQL unique constraints and row serialization.
- **Status**: `IMPLEMENTED & VERIFIED IN PHASE 3B.3`
- **Responsible Person**: Senior Backend Engineer & Database Architect

---

### Decision 12: Human-Readable Order and KOT Sequential Numbering
- **Why It Matters**: Restaurant staff and kitchen displays rely on daily readable ticket identifiers (`ORD-YYYYMMDD-XXXX` and `KOT-YYYYMMDD-XXXX`). Simple `COUNT(*)` calculations collide under concurrent requests.
- **Implemented Strategy in Phase 3B.3**: Monotonically increasing sequential counters managed atomically in PostgreSQL table `daily_counters` scoped by `(tenant_id, prefix, date_str)`. Uses PostgreSQL row-level locking via atomic upsert (`INSERT ... ON CONFLICT (tenant_id, prefix, date_str) DO UPDATE SET count = daily_counters.count + 1 RETURNING count`) within the order transaction snapshot.
- **Status**: `IMPLEMENTED & VERIFIED IN PHASE 3B.3`
- **Responsible Person**: Senior Backend Engineer

---

### Decision 13: Transactional Outbox for Real-Time Event Delivery
- **Why It Matters**: Publishing WebSocket events directly before database commit creates phantom events if the transaction rolls back. Publishing events post-commit without durability causes lost events if the process crashes.
- **Implemented Strategy in Phase 3B.3**: Transactional Outbox pattern via `outbox_events` table. `order.created` and `kot.created` events are written inside the exact same atomic PostgreSQL `$transaction` as the order and KOT. An asynchronous, non-blocking outbox worker dispatches events post-commit with automatic retry tracking, exponential backoff, and failure tolerance without blocking the HTTP response.
- **Status**: `IMPLEMENTED & VERIFIED IN PHASE 3B.3`
### Decision 14: WebSocket Subscription Authorization Matrix & Tenant Isolation
- **Why It Matters**: Allowing unrestricted WebSocket subscriptions (`*` or client-dictated topics) enables malicious actors or guests at Table 1 to intercept kitchen tickets, billing notifications, or other tables' orders.
- **Implemented Strategy in Phase 3B.4**: Strict server-enforced topic authorization matrix:
  - `kitchen:kots`: Restricted to `KITCHEN_STAFF`, `CHEF`, `MANAGER`, `ADMIN`.
  - `orders:all`: Restricted to `WAITER`, `CAPTAIN`, `CASHIER`, `MANAGER`, `ADMIN`.
  - `billing:all`: Restricted to `CASHIER`, `MANAGER`, `ADMIN`.
  - `order:{orderId}`: Restricted to staff or guest authenticated with matching order context.
  - Strict tenant boundary: All frames broadcast to connections matching `client.tenantId === event.tenantId`. Cross-tenant delivery is architecturally impossible.
- **Status**: `IMPLEMENTED & VERIFIED IN PHASE 3B.4`
- **Responsible Person**: Senior Backend Engineer & Security Architect

### Decision 15: Concurrency-Safe Outbox Worker Claiming & Failure Recovery
- **Why It Matters**: Running multiple backend instances or worker processes concurrently could lead to duplicate outbox event claiming and duplicate socket broadcasts. Furthermore, transport failures must never crash or invalidate order creation.
- **Implemented Strategy in Phase 3B.4**:
  - PostgreSQL row locking (`FOR UPDATE SKIP LOCKED`) inside `outboxService.claimPendingBatch()` guarantees exactly-once claim semantics across arbitrary worker processes.
  - Stale processing claims (>60s) automatically reclaimed.
  - Bounded retries: 5 attempts max with exponential backoff (`min(1000 * 2^(retryCount-1), 30000)` ms).
  - Permanent failure state: `FAILED` after 5 attempts with `lastError` recorded.
  - Administrative recovery: `npm run worker:outbox` CLI and programmatic recovery methods (`retryFailedEvent`, `retryAllFailedEvents`).
### Decision 16: KOT Lifecycle State Machine & Parent Order Progress Synchronization
- **Why It Matters**: Unchecked KOT transitions could allow tickets to skip critical preparation steps (e.g. jumping from NEW directly to READY or SERVED), allow race conditions between concurrent chefs, or prematurely mark an entire dining order SERVED when other kitchen stations are still cooking.
- **Implemented Strategy in Phase 3C**:
  - Strict server-side state machine: `NEW (PENDING) -> ACCEPTED -> PREPARING -> READY -> SERVED`.
  - Illegal transitions rejected with HTTP 409 `INVALID_STATUS_TRANSITION`.
  - Repeated transition requests safely return current state (idempotent 200 OK without duplicate outbox emissions).
  - PostgreSQL row locking (`SELECT id, status FROM kots WHERE id = $1::uuid FOR UPDATE`) prevents race condition overwrites.
  - Parent order progress is computed across all associated KOTs: Order becomes `READY` if and only if all KOTs are at least `READY`; becomes `SERVED` if and only if all KOTs are `SERVED`.
- **Status**: `IMPLEMENTED & VERIFIED IN PHASE 3C`
- **Responsible Person**: Senior Backend Engineer & Hospitality Workflow Architect

### Decision 17: Item-Level Status Representation & Forward Migration Path
- **Why It Matters**: The kitchen may prepare items at different times. The current Prisma schema defines `status` on `OrderItem` (`PLACED`, `PREPARING`, `READY`, `SERVED`), while `KotItem` is an immutable junction record without a dedicated status column.
- **Implemented Strategy in Phase 3C**:
  - In Phase 3C, advancing a KOT updates all linked `OrderItem` records to the corresponding stage (`PREPARING`, `READY`, `SERVED`).
  - If partial bumping of individual items within a single KOT ticket is required in a future phase:
    - Safe forward-only migration: `ALTER TABLE kot_items ADD COLUMN status VARCHAR(50) DEFAULT 'PENDING';`
    - Preserves existing backward compatibility without altering existing ticket structures.
- **Status**: `DOCUMENTED & VERIFIED IN PHASE 3C`
- **Responsible Person**: Senior Backend Engineer & Database Architect

---

### Decision 18: Sequential Invoice Numbering & Daily Counter Reuse
- **Why It Matters**: Indian GST regulations require unique, consecutive tax invoice numbers within a financial period.
- **Implemented Strategy in Phase 4A**: Reuses existing `daily_counters` table with `counter_type = 'INVOICE'` and `scope = YYYYMMDD`. Atomic PostgreSQL upsert allocates sequential numbers formatted as `INV-YYYYMMDD-XXXX` (e.g. `INV-20261011-0001`). Protected against date rollover and concurrent race conditions.
- **Status**: `IMPLEMENTED & VERIFIED IN PHASE 4A`
- **Responsible Person**: Senior Backend Engineer & Database Architect

---

### Decision 19: Immutable Invoice Snapshot & Separation from Live Catalog
- **Why It Matters**: Adjusting a menu item price or description in the admin portal must not alter already generated historical invoices.
- **Implemented Strategy in Phase 4A**: `bill_items` table stores an immutable snapshot of item names, quantities, unit prices, and line totals at the instant of invoice creation. Historical queries read from `bill_items`, completely decoupled from future menu adjustments.
- **Status**: `IMPLEMENTED & VERIFIED IN PHASE 4A`
- **Responsible Person**: Senior Backend Engineer & Product Lead

---

### Decision 20: Room Charge Settlement Policy
- **Why It Matters**: Dining orders can be billed to guest hotel rooms (`ROOM_CHARGE`).
- **Implemented Strategy in Phase 4C**: `ROOM_CHARGE` is accepted only for orders bound to a verified hotel room (`type === "ROOM"`). Rejects dining table orders with HTTP 400 `INVALID_ROOM_CHARGE`. External PMS ledger synchronization is dispatched via transactional outbox (`payment.updated`) until direct PMS vendor adapter credentials are configured.
- **Status**: `IMPLEMENTED & VERIFIED IN PHASE 4C`
- **Responsible Person**: Senior Backend Engineer & Hospitality Systems Integrator

---

### Decision 21: Conditional Dining Table Occupancy Release
- **Why It Matters**: Releasing a dining table merely because one bill was settled risks marking a table vacant while guests are still dining on a second active tab.
- **Implemented Strategy in Phase 4C**: When an order bill is fully paid, the dining table status is updated to `VACANT` **only if** `otherActiveOrders === 0`. If another active order is pending on that table, the table remains occupied. Hotel room status is never altered by restaurant bill settlement.
- **Status**: `IMPLEMENTED & VERIFIED IN PHASE 4C`
- **Responsible Person**: Senior Backend Engineer & Operations Lead

---

### Decision 22: Cloud-to-Printer Network Architecture & Hardware Commissioning
- **Why It Matters**: When the backend runs on a Cloud VPS while physical thermal printers sit on a private restaurant LAN, opening raw TCP sockets (port 9100) over the public internet poses severe security risks and is blocked by NAT/firewalls.
- **Adopted Architecture & Hardening Strategy (Phase 6E)**:
  1. **Strict Zero-Public-Port Invariant**: Raw printer TCP port 9100 must NEVER be port-forwarded or exposed to the public internet.
  2. **Production Cloud Architecture**:
     - **Option A (VPN Tunnel)**: WireGuard / Tailscale site-to-site mesh VPN interconnecting Cloud VPS to venue router/subnet. Fastify's `NetworkEscPosAdapter` communicates directly over private VPN IP space (`10.x.x.x` or `192.168.x.x`).
     - **Option B (Outbound Local Print Gateway)**: Lightweight Node.js/Go daemon on venue billing PC or Raspberry Pi that establishes an authenticated, outbound WSS/HTTPS connection to Cloud VPS. Backend pushes rendered ESC/POS binaries to gateway, which spools locally to LAN or USB thermal printers.
  3. **Hardened Print-Worker Recovery**: Abandoned `PRINTING` jobs (> 60s) are recovered as `UNCERTAIN` rather than blindly reset to `QUEUED`, preventing duplicate physical tickets or bills.
  4. **Physical Hardware Commissioning Policy**: Formal commissioning requires physical hardware on-site; mock/loopback adapters provide 100% automated test coverage without fabricating physical hardware telemetry.
- **Status**: `IMPLEMENTED & VERIFIED IN PHASE 6E`
- **Responsible Person**: Senior Full-Stack & Deployment Engineer

---

## 3. Decision Sign-Off Summary Table

| ID | Title | Recommendation | Status | Owner |
|---|---|---|---|---|
| D-01 | Auth Mechanism | Bearer JWT Header | Implemented (Phase 1) | Backend Lead |
| D-02 | QR Security | Ephemeral Signed JWT Session | Implemented (Phase 3B.1) | Backend + Frontend |
| D-03 | Stock Deduction Timing | On KOT Creation (`KOT_CREATED`) | Implemented (Phase 5) | Backend + Ops |
| D-04 | KOT Station Split | Single KOT with station tags | Implemented (Phase 3C) | Backend + Chef |
| D-05 | Room Charge Folio | Asynchronous PMS Adapter | Implemented (Phase 4C) | Systems Integrator |
| D-06 | Hardware Printing | Backend Queue + LAN Print Agent | Implemented (Phase 6) | Hardware Lead |
| D-07 | Multi-Tenancy | `tenant_id` on all tables | Implemented | DB Architect |
| D-08 | Tax & Service Charge | CGST 2.5% + SGST 2.5% + 5% SC | Implemented (Phase 4A) | Finance Lead |
| D-09 | QR Expiry & Revocation Schema | Forward-only nullable migration (`expires_at`, `revoked_at`) | Documented Policy | Backend DB Architect |
| D-10 | Cart Validation Table/Room Status Policy | Read-only validation; status transition handled in Order Creation | Documented Policy | Senior Backend Engineer |
| D-11 | Idempotency Scoping & Deduplication | Database-backed `idempotency_keys` with SHA-256 hash & HTTP 409 | Implemented (Phase 3B.3) | Senior Backend Engineer |
| D-12 | Daily Order & KOT Number Sequence | Atomic `daily_counters` with row lock `ORD/KOT-YYYYMMDD-XXXX` | Implemented (Phase 3B.3) | Senior Backend Engineer |
| D-13 | Reliable Event Delivery | Transactional Outbox (`outbox_events`) + async worker | Implemented (Phase 3B.3) | Senior Backend Engineer |
| D-14 | WebSocket Authorization & Multi-Tenant Isolation | Fastify WS on `/ws` with strict role matrix and tenant match | Implemented (Phase 3B.4) | Senior Backend Engineer |
| D-15 | Multi-Process Outbox Claiming & Recovery | `FOR UPDATE SKIP LOCKED` + bounded 5 retries + worker script | Implemented (Phase 3B.4) | Senior Backend Engineer |
| D-16 | KOT State Machine & Parent Order Synchronization | `NEW -> ACCEPTED -> PREPARING -> READY -> SERVED` + row lock | Implemented (Phase 3C) | Senior Backend Engineer |
| D-17 | Item-Level Preparation Representation | Update `order_items.status`; documented `kot_items.status` migration | Documented & Verified (Phase 3C) | Senior Backend Engineer |
| D-18 | Sequential Invoice Numbering Scope | Atomic `daily_counters` with `INV-YYYYMMDD-XXXX` | Implemented (Phase 4A) | Senior Backend Engineer |
| D-19 | Immutable Invoice Snapshot & History | Snapshot in `bill_items` protecting financial history | Implemented (Phase 4A) | Senior Backend Engineer |
| D-20 | Room Charge Tender Validation | Restricted to hotel room orders; outbox event dispatch | Implemented (Phase 4C) | Senior Backend Engineer |
| D-21 | Conditional Dining Table Release | Table to `VACANT` only if zero remaining active orders | Implemented (Phase 4C) | Senior Backend Engineer |
| D-22 | Cloud-to-Printer Network Architecture & Recovery Hardening | Strict zero-public-port policy; VPN/Gateway; UNCERTAIN recovery on stale leases | Implemented & Verified (Phase 6E) | Senior Deployment Engineer |



