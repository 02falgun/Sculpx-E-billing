# SCULPX E-Billing — Authentication & Authorization Architecture

> **Audience**: Backend Security Architect, Frontend Integration Engineer  
> **Status**: Handover Specification for Token/Session Transition  

---

## 1. Dual-Track Access Architecture

The system operates two distinct access tracks:

```text
Track 1: Public Customer Access (Unauthenticated)
QR Code Scan -> Token Resolution -> Transient Menu Browsing -> Order Submission

Track 2: Internal Staff Access (JWT Authenticated)
Staff Sign-In -> Role & Permission Verification -> RoleGuard Enforcement -> Station Operations
```

---

## 2. Staff Authentication Lifecycle

### 2.1 Sign-In & Token Issue
- **Endpoint**: `POST /api/v1/auth/login`
- **Payload**: `{ "email": string, "pinOrPassword": string }`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "usr-demo-waiter",
        "name": "Rahul Sharma",
        "email": "waiter@demo.com",
        "role": "WAITER",
        "permissions": ["view_tables", "create_orders", "pos_access", "request_bill"]
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresAt": "2026-10-11T15:00:00.000Z"
    }
  }
  ```

### 2.2 Token Storage & Propagation
- **Client Storage**: Persisted in `localStorage` under key `restro_staff_auth` managed by Zustand (`authStore.ts`).
- **HTTP Requests**: `ApiClient` automatically extracts `session.token` and attaches:
  ```http
  Authorization: Bearer <token>
  ```
- **Session Expiration**:
  - Access Token TTL: Recommended 8 hours (standard hospitality shift duration).
  - On receiving `401 Unauthorized` or token expiry, frontend automatically clears session and redirects to `/login?redirect=<current_path>`.

---

## 3. Role & Permission Hierarchy

### 3.1 Role Hierarchy Matrix

| Role Code | Display Title | Default Station Route | Primary Privileges |
|---|---|---|---|
| `SUPER_ADMIN` | Super Admin / Hotel Owner | `/admin` | Complete property governance, audit trails, integrations, database overrides. |
| `ADMIN` | Restaurant / Hotel Admin | `/admin` | Menu catalog, pricing, hardware printers, inventory, staff user creation. |
| `MANAGER` | Floor Manager | `/manager` | Operational velocity, void exceptions, staff overrides, cashier ledger oversight. |
| `CAPTAIN` | Floor Captain | `/staff` | Table allocation, VIP guest assignments, waiter oversight. |
| `WAITER` | Waiter / Floor Staff | `/staff` | Table status review, mobile POS ordering, KOT dispatch, bill request. |
| `CASHIER` | Cashier / Billing Desk | `/cashier` | Tax invoice generation, payment settlement, refunds, thermal receipt printing. |
| `KITCHEN_STAFF` | Kitchen Chef / Expediter | `/kitchen` | KDS ticket progression (`ACCEPTED` -> `PREPARING` -> `READY`), elapsed timers. |

### 3.2 Granular Permission Codes (V1 Production Catalog)
The backend enforces a centralized 36-key permission catalog in `backend/src/config/permissions.ts`:
- **General**: `dashboard.view`
- **Hotel Rooms**: `rooms.view`, `rooms.create`, `rooms.update`, `rooms.deactivate`
- **Restaurant**: `tables.view`, `tables.create`, `tables.update`, `tables.deactivate`, `qr.manage`
- **Menu**: `menu.view`, `menu.create`, `menu.update`, `menu.publish`
- **People & Staff**: `staff.view`, `staff.invite`, `staff.update`, `staff.deactivate`, `roles.view`, `roles.manage`, `permissions.assign`
- **Inventory**: `inventory.view`, `inventory.manage`
- **Orders & Kitchen**: `orders.view`, `orders.create`, `orders.update`, `kitchen.view`, `kitchen.update`
- **Finance & Billing**: `billing.view`, `billing.create_invoice`, `payments.record`, `payments.refund`
- **System & Administration**: `reports.view`, `settings.manage`, `audit.view`, `tenant.manage`

---

## 4. Session Revocation & Token Versioning (`tokenVersion`)

To ensure immediate revocation of compromised accounts or stale permissions without waiting for JWT expiration:
1. Every `User` record maintains an integer field `tokenVersion` (default `1`).
2. The user's active `tokenVersion` is baked into the signed JWT payload.
3. On every authenticated request, `backend/src/middleware/auth.ts` validates that the token's `tokenVersion` strictly matches the database record.
4. When an administrator resets a staff password, alters permissions, or clicks **Revoke All Sessions**, the server atomically increments `tokenVersion`:
   ```sql
   UPDATE "users" SET "tokenVersion" = "tokenVersion" + 1 WHERE "id" = :userId;
   ```
5. Any previously issued tokens are immediately rejected with `401 Unauthorized` (`code: SESSION_REVOKED`).

---

## 5. Multi-Tenant Onboarding & Multi-Location Isolation

### 5.1 Hierarchical Scope Authorization
In addition to platform-wide `SUPER_ADMIN`, the platform authorizes users across explicit organization and location scopes:
- **`SUPER_ADMIN`**: Unrestricted platform governance. Can create franchise organizations, onboard independent businesses, provision locations, and assign members.
- **`FRANCHISE_OWNER` / Group Admin**: Organization membership in `OrganizationUser`. Permitted to view and oversee all locations tied to their authorized `organizationId`. Cannot access unrelated franchise organizations or create unassigned branches.
- **`LOCATION_ADMIN` / `HOTEL_ADMIN`**: Assigned to specific branches via `UserLocationAssignment`. Authorized strictly for that operational property.
- **Branch Staff (`CHEF`, `WAITER`, `CASHIER`)**: Bound to explicit location assignments (`UserLocationAssignment`). Cross-location actions are blocked.

### 5.2 Server-Side Location Scope Resolution (`requireTenantScope`)
Client-supplied headers or body IDs (`x-location-id`, `x-target-tenant-id`) are validated on every request:
1. Authenticated user's `authorizedTenantIds` and `authorizedLocationIds` are resolved from their active assignments in PostgreSQL.
2. If the user is `SUPER_ADMIN`, any valid tenant/location is permitted.
3. If the user is branch staff or location admin, the requested tenant must be in `authorizedTenantIds`. Cross-tenant attempts are rejected with HTTP 403 `FORBIDDEN`.
4. **Suspension Check**: The location's status is checked in database. If `status !== 'ACTIVE'`, any mutating HTTP request (`POST`, `PUT`, `PATCH`, `DELETE`) on tables, rooms, orders, or bills is rejected with HTTP 403 `LOCATION_SUSPENDED`. Read-only GET requests remain authorized for auditing and historical invoice viewing.

### 5.3 Pilot Onboarding & Zero Fake Data Rule
- `POST /api/v1/organizations/franchise/onboard` creates the franchise organization, its first location, isolated operational tenant, and provisions initial owner credentials in a single atomic database transaction (`prisma.$transaction`).
- `POST /api/v1/locations` creates a standalone location (or franchise branch) and isolated operational tenant.
- All newly created locations start in a clean state: **0 tables, 0 rooms, 0 menu items, 0 orders, 0 fake invoices**. No static demo arrays or fabricated business records exist.

---

## 6. Public QR Ordering Security

1. **Token Strategy**:
   - The QR code contains an opaque, cryptographically random token (`tbl-tenant-t01-abc123...`).
   - The QR URL NEVER exposes internal database IDs, hotel secrets, or administrative credentials.
2. **QR Rotation**:
   - Authorized admins can rotate table/room QR tokens at any time via `POST /api/v1/tables/:id/qr/rotate` or `POST /api/v1/rooms/:id/qr/rotate`.
   - Previous QR tokens are immediately deactivated in `qr_codes` table, preventing stale paper cards from submitting orders.
3. **Session Scope**:
   - Scanning a table QR grants customer permission to view the menu and place orders for **THAT SPECIFIC TABLE ONLY**.
   - Submitting orders for Table 02 using Table 01's context is rejected by backend session token verification.
