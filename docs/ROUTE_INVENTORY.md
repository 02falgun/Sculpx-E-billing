# SCULPX E-Billing — Complete Route Inventory & Workspace Guide

> **Document Status**: Production Complete  
> **Framework**: Next.js App Router (TypeScript)  
> **Design Theme**: High-Contrast Monochrome Noir (`#000000`, `#FFFFFF`, `#737373`, `#F5F5F5`)

---

## 1. Master Route Directory

```text
src/app/
├── (staff)/                  # Staff workspace route group
│   ├── billing/              # Quick billing view
│   ├── dashboard/            # Staff shift overview
│   ├── orders/               # Floor order queue
│   ├── pos/                  # Table-side POS interface
│   └── tables/               # Floor table grid
├── admin/                    # Administrative management backoffice
│   ├── audit/                # Cryptographic audit logs
│   ├── integrations/         # Gateways, ESC/POS, WebSockets
│   ├── inventory/            # Ingredient inventory
│   │   ├── recipes/          # Recipe bill-of-materials
│   │   └── transactions/     # Stock movement audit trail
│   ├── menu/                 # Menu catalog & modifier editor
│   ├── print-jobs/           # Thermal print queue monitor
│   ├── printers/             # ESC/POS printer hardware fleet
│   ├── qr/                   # High-res QR code studio
│   ├── reports/              # Revenue & tax remittance analytics
│   ├── rooms/                # Guest suite & in-room dining management
│   ├── settings/             # GSTIN, property identity, charges
│   ├── tables/               # Floor plan & table seating setup
│   └── users/                # Employee permissions & PIN management
├── bill/
│   └── [billId]/             # Customer digital tax invoice & payment
├── cart/                     # Customer cart drawer & items review
├── cashier/                  # Cashier settlement station
│   ├── bills/                # All bills & bill details ([billId])
│   ├── outstanding/          # Unpaid & pending settlements
│   └── payments/             # Collections & refunds journal
├── checkout/                 # Customer order pre-flight & checkout
├── kitchen/                  # Kitchen Display System (KDS Board)
├── login/                    # Unified staff station sign-in
├── manager/                  # Floor manager control centre
│   ├── billing/              # Billing audit & void approvals
│   ├── exceptions/           # Overrides, comps, & cancellations
│   ├── kitchen/              # Kitchen bottleneck monitor
│   ├── orders/               # All active floor orders
│   ├── reports/              # Shift velocity & labor metrics
│   └── tables/               # Table turn-time & occupancy
├── menu/
│   ├── [qrToken]/            # Public QR token router
│   ├── room/[roomId]/        # In-room dining customer menu
│   └── table/[tableId]/      # Table customer menu
├── offline/                  # PWA offline fallback page
├── order/
│   └── [orderId]/            # Customer real-time order tracking
└── staff/                    # Waiter floor terminal (canonical)
    ├── orders/               # Waiter active order list
    ├── pos/                  # Waiter mobile POS ordering
    └── tables/               # Waiter table occupancy overview
```

---

## 2. Workspace Access Breakdown

### Workspace 1: Customer (Guest — No Login)
- **Primary Flows**:
  1. Scan physical QR -> Route resolves context (`/menu/table/T01` or `/menu/room/301`).
  2. Browse categorization, search culinary items, view allergens & spice tags (`/menu/*`).
  3. Select item variants & modifier groups via modal (`ModifierModal`).
  4. View cart, review price breakdown & special instructions (`/cart`).
  5. Validate server availability & submit order (`/checkout`).
  6. Track live kitchen preparation timeline (`/order/[orderId]`).
  7. View GST tax invoice & complete online payment via UPI/Card (`/bill/[billId]`).
- **Security Boundary**:
  - Entirely unauthenticated for internal staff credentials.
  - Context resolved via URL token (`qrToken`, `tableId`, `roomId`).
  - Read-only access to menu, prices, and public order status.
  - Zero access to staff POS, KDS, cashier desks, or administration routes.

### Workspace 2: Waiter / Floor Staff
- **Primary Flows**:
  - Sign in with staff credentials or PIN (`/login`).
  - View floor plan status: VACANT, OCCUPIED, RESERVED, BILL_REQUESTED (`/staff/tables`).
  - Take walk-in or table orders rapidly using mobile POS (`/staff/pos`).
  - Select portion modifiers, attach kitchen notes, and dispatch to kitchen.
  - View active orders and preparation status (`/staff/orders`).
- **Required Roles**: `WAITER`, `CAPTAIN`, `MANAGER`, `ADMIN`, `SUPER_ADMIN`.
- **Guarded By**: `RoleGuard(allowedRoles=["WAITER", "CAPTAIN", "MANAGER", "ADMIN"])`.

### Workspace 3: Kitchen Display System (KDS)
- **Primary Flows**:
  - Live full-screen ticket board (`/kitchen`).
  - Instant sound & visual alert on new KOT creation via WebSocket.
  - Progress ticket states: `ACCEPTED` -> `PREPARING` -> `READY` -> `SERVED`.
  - Elapsed countdown timer (`KOTTimer`) color-coded to target preparation SLA.
  - Receive real-time cancellations or modifications with immediate visual alerts.
- **Required Roles**: `KITCHEN_STAFF`, `MANAGER`, `ADMIN`, `SUPER_ADMIN`.
- **Guarded By**: `RoleGuard(allowedRoles=["KITCHEN_STAFF", "MANAGER", "ADMIN"])`.

### Workspace 4: Cashier / Settlement Desk
- **Primary Flows**:
  - Ledger of all bills across shifts (`/cashier`, `/cashier/bills`).
  - Filter outstanding vs paid tabs (`/cashier/outstanding`).
  - Record payments: Cash, Card (with reference), UPI (with verification), Room Charge Folio (`/cashier`).
  - Apply authorized discounts or split bills.
  - Dispatch thermal receipts to reception receipt printer (`useCreatePrintJob`).
- **Required Roles**: `CASHIER`, `MANAGER`, `ADMIN`, `SUPER_ADMIN`.
- **Guarded By**: `RoleGuard(allowedRoles=["CASHIER", "MANAGER", "ADMIN"])`.

### Workspace 5: Floor Manager
- **Primary Flows**:
  - Floor velocity, turnover rate, and open table monitor (`/manager/tables`).
  - Kitchen bottleneck analytics & delayed order tracking (`/manager/kitchen`).
  - Operational exception overrides: void tickets, comps, price adjustments (`/manager/exceptions`).
  - Live revenue stream and shift balance report (`/manager/reports`).
- **Required Roles**: `MANAGER`, `ADMIN`, `SUPER_ADMIN`.
- **Guarded By**: `RoleGuard(allowedRoles=["MANAGER", "ADMIN"])`.

### Workspace 6: Administrator & Super Admin
- **Primary Flows**:
  - Menu catalog management (items, categories, modifiers, pricing) (`/admin/menu`).
  - Room & table configuration (`/admin/rooms`, `/admin/tables`).
  - QR Code Studio (high-resolution SVG/PNG generation, thermal print layout) (`/admin/qr`).
  - Inventory management (ingredients, stock alerts, purchases, waste) (`/admin/inventory`).
  - Hardware printer fleet monitoring (ESC/POS thermal printers) (`/admin/printers`).
  - Staff rosters, credentials, and access privilege assignments (`/admin/users`).
  - Cryptographic audit trail & compliance logs (`/admin/audit`).
  - Gateway settings, WebSockets, and system integrations (`/admin/integrations`, `/admin/settings`).
- **Required Roles**: `ADMIN`, `SUPER_ADMIN`.
- **Guarded By**: `RoleGuard(allowedRoles=["ADMIN", "SUPER_ADMIN"])`.
