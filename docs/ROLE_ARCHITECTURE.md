# SCULPX E-Billing: Role Architecture & Security Matrix

## 1. Overview
SCULPX E-Billing operates across two strictly segregated user planes:
- **Customer World (Unauthenticated / QR Bound)**: Table and In-Room dining guests ordering without login credentials.
- **Internal User World (Authenticated Station)**: Staff, managers, and system administrators entering via `/login` and routed to dedicated workspaces.

---

## 2. Role Hierarchy & Primary Workspaces

| Role Key | Display Name | Landing Workspace | Accessible Routes | Primary UX Focus |
| :--- | :--- | :--- | :--- | :--- |
| **CUSTOMER** | Guest Diner | `/menu/table/[tableId]` or `/menu/room/[roomId]` | `/menu/*`, `/cart`, `/checkout`, `/order/*`, `/bill/*` | Warm, visual, food-first, zero operational noise |
| **WAITER** / **CAPTAIN** | Floor Waitstaff | `/staff` | `/staff`, `/staff/tables`, `/staff/orders`, `/staff/pos` | Speed, table occupancies, instant KOT fire |
| **CASHIER** | Cashier Desk | `/cashier` | `/cashier`, `/cashier/bills/*`, `/cashier/payments`, `/cashier/outstanding` | Financial collections, GST invoices, UPI, refunds |
| **KITCHEN_STAFF** | Chef / Expediter | `/kitchen` | `/kitchen`, `/kitchen/kot/*` | High-contrast KDS, cooking timers, status progression |
| **MANAGER** | Floor Manager | `/manager` | `/manager`, `/manager/orders`, `/manager/tables`, `/manager/kitchen`, `/manager/billing`, `/manager/exceptions`, `/manager/reports` | Operational velocity, exceptions, hardware alerts |
| **ADMIN** | Administrator | `/admin` | `/admin/*` (Menu, Inventory, Printers, QR, Users, Reports, Settings) | Full property catalog and hardware governance |
| **SUPER_ADMIN** | Owner / Governance | `/admin` | All Admin routes + `/admin/integrations`, `/admin/audit` | System configuration, API keys, cryptochain audit |

---

## 3. Route Protection & Authorization Design

Route-level security is enforced via centralized utilities in `src/utils/auth.ts` and the `RoleGuard` wrapper component in `src/components/common/RoleGuard.tsx`.

```typescript
// Centralized Access Validation
export function canAccess(user: User | null | undefined, pathname: string): boolean;
export function hasRole(user: User | null | undefined, allowedRoles: Role[]): boolean;
export function hasPermission(user: User | null | undefined, permission: string): boolean;
export function getDefaultRouteForRole(role?: Role | null): string;
```

### Access Matrix:
- Customer routes (`/menu/*`, `/cart`, `/checkout`, `/order/*`, `/bill/*`) are public.
- Internal routes require authentication. Unauthenticated requests redirect to `/login?redirect=...`.
- If a logged-in user attempts to access an unauthorized route (e.g. Waiter navigating to `/admin`), `RoleGuard` renders a Restricted Station warning with a direct button to their designated workspace.
- **Critical Production Rule**: Frontend UI conditional checks are UX-only boundaries. Production backend microservices enforce authoritative token signature verification.
