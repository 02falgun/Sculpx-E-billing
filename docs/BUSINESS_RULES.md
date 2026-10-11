# SCULPX E-Billing — Business Rules & Data Ownership

> **Document Type**: Technical Specification & Governance Guide  
> **Audience**: Backend Database Architect, Node.js Engineers, Product Lead  
> **Status**: Comprehensive Frontend Invariants & Required Backend Validations  
> **Convention**: All items requiring formal sign-off are marked with `[PENDING BACKEND AGREEMENT]`.

---

## 1. Core Architectural Invariant: Frontend is Non-Authoritative

> [!CAUTION]
> The frontend browser environment is inherently untrusted. The backend Node.js + PostgreSQL server must treat all client submissions as unverified intents. **Never treat client-computed prices, discounts, taxes, inventory balances, or payment statuses as authoritative.**

---

## 2. Orders & Order Lifecycle

### 2.1 Ordering Context Validation
- Every customer order MUST be bound to a cryptographically valid ordering context:
  - Table context (`TABLE`, `tableId`, `tableNumber`)
  - Room context (`ROOM`, `roomId`, `roomNumber`, `guestName`, `roomFolioId`)
- **Table vs. Room Distinction**:
  - `TABLE` orders require immediate dining service and can be settled at the table or cashier desk via Cash, Card, or UPI.
  - `ROOM` orders are delivered to the guest suite and support both instant settlement and the `ROOM_CHARGE` tender method (posting charges to the hotel property management folio).
- `[PENDING BACKEND AGREEMENT]`: Should a QR token expire after a single dining session (e.g. 2 hours after first scan / bill settlement), or remain a static permanent token tied to physical table hardware? *(Suggested default: Permanent table token that creates dynamic ephemeral session IDs on scan).*

### 2.2 Server-Side Price & Availability Enforcement
- When `POST /api/v1/orders` is called:
  1. The backend must query current item availability (`is_available = true`). If any item is 86'd (out of stock), the order must be rejected with HTTP `409 Conflict` and error code `ITEM_UNAVAILABLE`.
  2. The backend MUST calculate item price, modifier costs, discounts, and taxes from the PostgreSQL database. Client-sent total values are ignored.
  3. Tax calculation: Standard Indian GST (CGST 2.5% + SGST 2.5% on F&B) or applicable item-specific tax rate.
- `[PENDING BACKEND AGREEMENT]`: Is discretionary Service Charge (default 5%) mandatory or guest-waivable on customer QR orders? *(Suggested default: Configurable per tenant; default enabled but waivable by Cashier/Manager).*

### 2.3 Order State Transitions
An order must strictly transition along the agreed state machine:

```text
[PLACED] -> [CONFIRMED] -> [PREPARING] -> [READY] -> [SERVED] -> [COMPLETED]
   │             │
   └───> [CANCELLED] (Only before PREPARING, unless Manager Override)
```

1. **PLACED**: Order submitted by customer QR or waiter POS; recorded in database.
2. **CONFIRMED**: Acknowledged by floor captain, waiter, or auto-accepted by kitchen.
3. **PREPARING**: Kitchen station has started cooking.
4. **READY**: Dishes are plated; expediters notified.
5. **SERVED**: Food runner delivered dishes to table/room.
6. **COMPLETED**: Bill settled and table closed.
7. **CANCELLED**: Aborted before cooking, or aborted after cooking via manager override.

### 2.4 Idempotency & Duplicate Order Prevention
- Network retries from mobile web browsers must not create duplicate orders.
- The client passes an `Idempotency-Key: <UUIDv4>` header on `POST /api/v1/orders`.
- The backend must cache idempotency keys in Redis or PostgreSQL for a minimum of 120 seconds. Repeated requests with the same key must return the cached order response without creating another database record.

### 2.5 Cancellation & Modification Rules
- Customers may only cancel an order while it is in the `PLACED` or `CONFIRMED` state.
- Once cooking has begun (`PREPARING`), cancellations REQUIRE a staff member with `override_orders` permission (`MANAGER` or `ADMIN`).
- Cancelled orders must record: `reason`, `cancelledBy` (`CUSTOMER`, `STAFF`, `SYSTEM`), `cancelledAt`, and `refundStatus`.

---

## 3. Kitchen Operations & Kitchen Order Tickets (KOTs)

### 3.1 Order vs. KOT Boundary
- An `Order` belongs to the guest/table.
- A `KOT` (Kitchen Order Ticket) belongs to the kitchen preparation stations.
- **Multiple KOTs per Order**:
  - A single dining order can spawn multiple KOTs over time:
    - Guests ordering starters first -> `KOT-1` generated.
    - Guests adding drinks or main courses 20 minutes later -> `KOT-2` generated.
  - Multi-station routing: If an order contains both bar items and tandoor items, the backend should route distinct station tickets or a split ticket (`KOT-Bar`, `KOT-Kitchen`).
- `[PENDING BACKEND AGREEMENT]`: Should multi-station splitting be performed on the backend upon order creation, or should all items remain on a unified KOT with station tags? *(Suggested default: Single KOT per order dispatch containing station flags per item).*

### 3.2 KOT Status Transitions
```text
[NEW / PENDING] -> [ACCEPTED] -> [PREPARING] -> [READY] -> [SERVED]
```
- **Lifecycle Transition Guards**:
  - `NEW (PENDING) -> ACCEPTED`: Chef accepts the ticket on the KDS display; records `acceptedAt`.
  - `ACCEPTED -> PREPARING`: Kitchen starts cooking; updates linked `OrderItem` status to `PREPARING`; parent `Order` transitions to `PREPARING`.
  - `PREPARING -> READY`: Kitchen marks food ready for expediting; records `readyAt`; updates linked `OrderItem` status to `READY`; emits `kot.ready` notification to `orders:all` for waitstaff.
  - `READY -> SERVED`: Food is picked up and delivered to table; records `servedAt`; updates linked `OrderItem` status to `SERVED`.
- **Repeated Requests (Idempotency)**:
  - If a staff member submits a transition to the state the ticket is already in, the backend returns HTTP 200 OK without errors or redundant outbox emissions.
- **Illegal Transition Rejection**:
  - Out-of-order state transitions (e.g., `NEW -> READY`, `SERVED -> PREPARING`) are rejected with HTTP 409 `INVALID_STATUS_TRANSITION`.
- **Multi-KOT Parent Order Synchronization**:
  - A parent `Order` is marked `READY` if and only if **all** KOT tickets belonging to the order are in `READY` or `SERVED` state.
  - A parent `Order` is marked `SERVED` if and only if **all** KOT tickets belonging to the order are in `SERVED` state.
  - If one KOT ticket is `READY` or `SERVED` while other KOTs for the order are still `NEW`, `ACCEPTED`, or `PREPARING`, the parent `Order` status remains `PREPARING`.
- **Item-Level Status Representation**:
  - Item status is maintained on `OrderItem.status` (`PLACED`, `PREPARING`, `READY`, `SERVED`).
  - `KotItem` functions as the immutable junction ticket record linking items to physical tickets.
- **Elapsed Cooking Timers & Urgency**:
  - Normal: < 15 minutes (`NORMAL`)
  - Warning (Amber): 15–20 minutes (`HIGH`)
  - Urgent (Red): > 20 minutes (`URGENT`)

---

## 4. Bills, Invoicing & Payment Settlement

### 4.1 Order vs. Bill Boundary
- An `Order` tracks dining requests.
- A `Bill` (`bills` table) is a legally binding financial tax invoice.
- **Immutable Financial Snapshot**:
  - When a Bill is generated (`POST /api/v1/bills/order/:id/generate`), the backend creates an immutable snapshot of all item names, quantities, unit prices, applied taxes, and applied discounts at that exact point in time.
  - Subsequent menu price adjustments never alter existing generated bills.
- Multiple orders from the same table session can be merged into a single consolidated Bill upon checkout.

### 4.2 Bill Status Progression
```text
[DRAFT] -> [ISSUED] -> [PARTIALLY_PAID] -> [PAID]
   │
   └───> [VOIDED] (Requires Manager PIN & Written Reason)
```

### 4.3 Bill vs. Payment Boundary
- A `Bill` represents liability (amount due).
- A `Payment` (`payments` table) represents an actual monetary settlement event.
- **Split Bills & Partial Payments**:
  - A bill can have multiple payment records (e.g., Guest A pays ₹500 via UPI, Guest B pays ₹700 via Credit Card).
  - Bill moves from `ISSUED` to `PARTIALLY_PAID` when `sum(payments.amount) < bill.grand_total`.
  - Bill moves to `PAID` only when `sum(payments.amount) >= bill.grand_total`.

### 4.4 Payment Methods & Room Charges
Supported methods: `CASH`, `CARD`, `UPI`, `ROOM_CHARGE`, `NET_BANKING`.
- **UPI**: Instant QR generation and webhook reconciliation.
- **ROOM_CHARGE**:
  - Permitted only for validated `ROOM` orders.
  - Posts invoice balance directly to hotel PMS room folio.
  - Backend must verify room status is `OCCUPIED` and guest name matches checked-in occupant.
- `[PENDING BACKEND AGREEMENT]`: Which PMS integration protocol or API will receive `ROOM_CHARGE` folio postings? *(Suggested default: Mocked in Stage 1; REST callback to PMS adapter in Stage 4).*

### 4.5 Refunds & Voiding
- Voiding a bill removes financial liability and releases table state. Requires:
  - `voided_reason` string (minimum 10 characters).
  - Staff identifier with `override_orders` / `ADMIN` role.
- Refunding a payment:
  - A payment can have multiple partial refunds, provided `sum(refunds.amount) <= payment.amount`.
  - Cashier or Manager initiates; gateway API performs reversal where applicable.

---

## 5. Inventory & Recipe Consumption

### 5.1 Backend Authoritative Stock Balances
- The frontend display of stock balances is purely informational.
- The PostgreSQL database is the single source of truth for stock levels.
- Every stock adjustment MUST insert an immutable row into `inventory_transactions`. Direct updates to `current_stock` without an audit log are forbidden.

### 5.2 Recipe Bill of Materials (BOM) & Consumption Timing
- Each menu item can be linked to a `Recipe` containing `RecipeIngredient` rows:
  - Example: *Paneer Butter Masala (1 portion)* consumes:
    - 0.200 kg Paneer
    - 0.050 kg Butter
    - 0.150 kg Tomato Gravy
- `[PENDING BACKEND AGREEMENT]`: When does automatic inventory stock deduction occur?
  - **Option A (Recommended)**: Upon order confirmation / KOT dispatch (`ORDER_CONFIRMED` / `KOT_CREATED`).
  - **Option B**: Upon bill settlement (`BILL_PAID`).
  - **Option C**: Manual end-of-day kitchen variance entry.
  *(Suggested default: Option A for accurate real-time low-stock alerts, with auto-restoration if order cancelled before cooking).*

### 5.3 Stock Depletion & Concurrent Orders
- When an inventory item reaches `current_stock <= minimum_threshold`, the backend emits an `inventory.stock.updated` WebSocket event and marks `is_low_stock = true`.
- If an inventory ingredient reaches `0`, the backend automatically marks all linked menu items as `is_available = false` (86'd) to prevent customer ordering.
- If two concurrent guest orders contend for the last portion of an item, PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) ensures the first transaction succeeds and the second receives `409 ITEM_UNAVAILABLE`.

---

## 6. QR Code Context & Access Security

### 6.1 QR Context Invariants
- Scanning a QR code provides contextual metadata:
  - Type: `TABLE` or `ROOM`
  - Identifier: Table Number (e.g., `01`, `02`) or Room Number (e.g., `101`, `102`)
- **No Sensitive Data in QR URLs**:
  - The URL contains an opaque token: `https://pos.grandpalace.com/menu/tbl-01-a9f2` or `/menu/table/01`.
  - The token does NOT contain hotel credentials, manager tokens, or internal database UUIDs.

### 6.2 Table Impersonation Prevention
- `[PENDING BACKEND AGREEMENT]`: What prevents a guest at Table 01 from manually editing their browser URL to `/menu/table/05` and placing orders onto Table 05?
  - **Option A (Recommended)**: Backend signs an ephemeral guest session token (JWT stored in browser sessionStorage) upon scanning a cryptographically signed QR token. Mutating endpoints (`/orders`) verify the table ID against the token payload.
  - **Option B**: Captain/Waiter POS must confirm/accept all customer-placed QR orders before they are fired to the kitchen.
  *(Suggested default: Combination of Option A signed session + Option B waiter approval for high-value orders).*

---

## 7. Summary of Unresolved Backend Decisions

| Domain | Decision Required | Recommended Default | Status |
|---|---|---|---|
| QR Context | QR Token Expiry Policy | Permanent table hardware token; ephemeral session token on scan | `PENDING BACKEND AGREEMENT` |
| Orders | Service Charge Discretionary Policy | 5% default, configurable per tenant, waivable by Cashier | `PENDING BACKEND AGREEMENT` |
| Kitchen | KOT Multi-Station Splitting | Single KOT per dispatch with item station tags | `PENDING BACKEND AGREEMENT` |
| Billing | PMS Room Charge Folio Endpoint | Mocked in Stage 1; REST adapter in Stage 4 | `PENDING BACKEND AGREEMENT` |
| Inventory | Recipe BOM Stock Deduction Timing | Deduct upon Order Confirmation / KOT dispatch | `PENDING BACKEND AGREEMENT` |
| Security | Table Spoofing Prevention | Cryptographically signed ephemeral QR session JWT | `PENDING BACKEND AGREEMENT` |
