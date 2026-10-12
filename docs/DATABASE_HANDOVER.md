# SCULPX E-Billing — Database Management, Dynamic Operations & Cleanup Handover

> **Audience**: Full-Stack Engineers, Database Architects, Platform Administrators, DevOps  
> **Topic**: Production Database Lifecycle, Dynamic Business Modules, Pilot Cleanup Policy, and Multi-Tenant Isolation  

---

## 1. Executive Summary & Policy

The SCULPX E-Billing application operates as a **100% database-driven, multi-tenant hotel and restaurant platform**. 

- **No Static/Mock Fallbacks**: All business telemetry, metrics, floor statuses, menus, guest orders, billing invoices, and hardware states originate strictly from authoritative PostgreSQL/Supabase records scoped to the authenticated tenant.
- **Zero Business Data for New Tenants**: A newly onboarded hotel property starts in a truthful, completely empty state (0 tables, 0 rooms, 0 menu categories, 0 menu items, 0 orders, 0 invoices, 0 staff accounts).
- **Authoritative Server Isolation**: Client applications cannot query or manipulate entities across tenant boundaries; tenant scoping is strictly extracted from verified server-side JWT or cryptographic QR tokens.
- **Strict Mock Segregation**: In production and pilot environments, `NEXT_PUBLIC_USE_MOCK_API=false` is enforced. API errors are surfaced as distinct actionable error states rather than falling back to demo or fabricated data.

---

## 2. Database Inventory & Pilot Tenant Audit

The comprehensive read-only inventory tool (`backend/scripts/inventory-db.ts`) inventories all tenant and platform records without exposing credentials:

```bash
# Execute read-only inventory audit:
npx tsx scripts/inventory-db.ts
```

### Current Pilot Database Findings (Snapshot)
- **Database Connection**: Hosted PostgreSQL via Supabase IPv4 transaction pooler (`aws-0-ap-northeast-2.pooler.supabase.com`).
- **Platform Super Administrators**: Authoritative accounts (`superadmin@ebilling.com`).
- **Target Pilot Tenant**: `e1b1d1f0-0000-4000-8000-000000000001` (`Sculpx Grand Hotel & Restaurant`, code: `sculpx-grand`).
- **Legacy Records Identified**:
  - 185 menu categories (including automated test run fixtures)
  - 108 menu items
  - 135 orders & 111 kitchen tickets (KOTs)
  - 32 billing invoices & 18 payments
  - 195 printers & 345 print jobs
  - 38 restaurant tables & 7 guest rooms
  - 14 staff accounts (including 7 `@demo.com` demo accounts)

---

## 3. Database Cleanup Workflow & Safeguards

The database cleanup utility (`backend/scripts/cleanup-tenant.ts`) implements non-negotiable safety rules:

1. **Dry-Run by Default**: Never modifies data unless `--execute` is explicitly passed with an exact tenant UUID confirmation.
2. **Strict Foreign-Key Aware Ordering**: Deletes dependent child records within an atomic `$transaction` block:
   - Print jobs → Printers → Print agents
   - Payments → Bill items → Bills
   - Inventory transactions → KOT items → KOTs → Order items → Orders
   - Table `currentOrderId` foreign-key references unlinked
   - Recipes → Inventory items
   - Modifier options → Modifier groups → Menu items → Menu categories
   - QR codes → Tables → Rooms
   - Custom roles → Staff invitations
   - Staff accounts (`*@demo.com`)
3. **Preservation of Critical Platform Data**:
   - System schema migrations (`_prisma_migrations`) remain untouched.
   - Built-in platform roles (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `KITCHEN_STAFF`, `CASHIER`, `WAITER`, `CAPTAIN`) remain intact.
   - Foreign tenant test records and other tenant databases remain strictly isolated.

### Cleanup Execution Options

#### Option A: Reset Pilot Tenant to Clean Initial State (Recommended)
Preserves the hotel tenant container and the legitimate administrator (`admin@ebilling.com`), while purging all obsolete demo rooms, tables, menus, orders, bills, payments, printers, and demo staff (`*@demo.com`):

```bash
# Step 1: Dry-run preview (read-only audit)
npx tsx scripts/cleanup-tenant.ts --tenant-id=e1b1d1f0-0000-4000-8000-000000000001 --reset-to-empty

# Step 2: Safe transactional execution (requires confirmation argument)
npx tsx scripts/cleanup-tenant.ts --tenant-id=e1b1d1f0-0000-4000-8000-000000000001 --reset-to-empty --execute --confirm=e1b1d1f0-0000-4000-8000-000000000001
```

#### Option B: Complete Tenant Purge
Completely wipes the tenant container and all associated child entities:

```bash
# Step 1: Dry-run preview
npx tsx scripts/cleanup-tenant.ts --tenant-id=e1b1d1f0-0000-4000-8000-000000000001

# Step 2: Safe transactional execution
npx tsx scripts/cleanup-tenant.ts --tenant-id=e1b1d1f0-0000-4000-8000-000000000001 --execute --confirm=e1b1d1f0-0000-4000-8000-000000000001
```

---

## 4. New Hotel Onboarding & Initial State

When a new hotel property is onboarded via the Super Admin portal (`POST /api/v1/tenants/onboard`):

1. **Initial State (Zero Data)**:
   - `Tables`: 0
   - `Rooms`: 0
   - `Menu Categories`: 0
   - `Menu Items`: 0
   - `Orders & KOTs`: 0
   - `Invoices & Payments`: 0
   - `Printers`: 0
   - `Inventory Items`: 0
   - `Staff Accounts`: 1 (the initial authorized Hotel Administrator)
2. **Pilot Readiness Indicator**:
   - Computes truthful readiness starting from `0%` until the administrator creates dining tables, guestrooms, and menu items.
3. **Empty States**:
   - Clear, professional empty-state displays guide the administrator to add their first items without rendering fictional placeholder figures or sample cards.

---

## 5. Database Backup and Recovery Strategy

Before executing any destructive operation on staging or production:

1. **Supabase Point-in-Time Recovery (PITR)**:
   - Ensure WAL archiving or automated daily backups are active in the Supabase dashboard.
2. **Manual Pre-Maintenance Snapshot**:
   ```bash
   # Export full database schema and data to compressed archive (omit credentials in scripts):
   pg_dump "$DIRECT_URL" --format=custom --file="backup_pre_cleanup_$(date +%Y%m%d_%H%M%S).dump"
   ```
3. **Restoration Command**:
   ```bash
   # Restore in case of rollback requirement:
   pg_restore --clean --if-exists --no-owner --dbname="$DIRECT_URL" "backup_pre_cleanup_<timestamp>.dump"
   ```

---

## 6. Environment & Mock Mode Configuration

Ensure the following configuration is verified in `.env.local` and runtime environment variables:

| Variable | Recommended Value | Purpose |
|---|---|---|
| `NEXT_PUBLIC_USE_MOCK_API` | `false` | Disables in-memory mocks; enforces live backend connectivity. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` (or hosted API URL) | Directs HTTP traffic to the Fastify API. |
| `NEXT_PUBLIC_WS_URL` | `ws://localhost:8000/ws` (or hosted WSS URL) | Live WebSocket channel for KDS, billing desk, and order updates. |
| `DATABASE_URL` | `postgresql://...` (pgbouncer pooler) | Transaction pooling for backend Fastify server. |
| `DIRECT_URL` | `postgresql://...` (session pooler: 5432) | Direct connection for Prisma schema migrations and DDL operations. |

---

## 7. Legitimate Static System Configuration

The following static constants are strictly preserved as legitimate platform metadata:

- **Built-in Role Catalog**: `SUPER_ADMIN`, `ADMIN`, `MANAGER`, `KITCHEN_STAFF`, `CASHIER`, `WAITER`, `CAPTAIN`.
- **System Permission Identifiers**: `pos:access`, `billing:collect_payment`, `kitchen:view_kds`, `menu:manage`, etc.
- **Dietary Types**: `VEG`, `NON_VEG`, `VEGAN`, `EGG`.
- **Status Enumerations**: `TableStatus`, `RoomStatus`, `OrderStatus`, `KotStatus`, `BillStatus`, `PaymentMethod`.
- **Currency Constants**: Symbol `₹`, Code `INR`.
