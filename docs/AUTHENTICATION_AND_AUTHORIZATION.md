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

### 3.2 Granular Permission Codes
The backend checks individual permission strings in addition to high-level roles:
- `all_superadmin`: Bypass all permission checks.
- `all_admin`: Bypass administrative checks.
- `manage_menu`: Edit items, categories, and prices.
- `manage_inventory`: Stock adjustments and recipe BOM.
- `manage_printers`: Hardware setup and queue retries.
- `override_orders`: Void tickets and discount waivers.
- `collect_payments`: Accept tender and settle tabs.
- `process_refunds`: Reverse settled transactions.

---

## 4. Frontend Route Guards vs. Backend Enforcement

> [!CAUTION]
> Frontend route guarding via `RoleGuard` and `canAccess()` is **PURELY A UX CONVENIENCE** to prevent staff from viewing unauthorized screens. **IT PROVIDES ZERO SECURITY.**

### Backend Security Rule:
Every backend endpoint MUST independently verify:
1. Valid JWT signature and unexpired timestamp.
2. Tenant scoping (`user.tenant_id == resource.tenant_id`).
3. Explicit role or permission check for the requested operation.

---

## 5. Public QR Ordering Security

1. **Token Strategy**:
   - The QR code contains a public identifier or opaque random token (e.g. `T01` or `qr_9f83a21b`).
   - The QR URL NEVER exposes internal database IDs, hotel secrets, or administrative credentials.
2. **Session Scope**:
   - Scanning a table QR grants customer permission to view the menu and place orders for **THAT SPECIFIC TABLE ONLY**.
   - Submitting orders for Table 02 using Table 01's context is rejected by backend session token verification.
