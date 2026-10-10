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
- **Suggested Default**: **Deduct on Order Confirmation / KOT Creation (`KOT_CREATED`)**.
  - *Rationale*: Kitchen immediately begins using stock once ticket is fired. If an order is cancelled prior to cooking, stock is restored with transaction reason `CANCELLED_RETURN`. If cancelled after cooking starts, it is recorded as `WASTAGE`.
- **Alternatives**:
  - *Option B*: Deduct upon bill payment. *Drawback*: During busy rushes, inventory alerts are delayed by 1-2 hours until guests settle tabs.
  - *Option C*: Manual end-of-shift reconciliation variance.
- **Status**: `PENDING BACKEND AGREEMENT`
- **Responsible Person**: Backend Developer & Operations Manager

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
- **Suggested Default**: **Backend Cloud Queue + Local Gateway Agent**.
  - The frontend submits print jobs to `POST /api/v1/print-jobs`. A lightweight local Node.js or Python daemon on the restaurant LAN polls or receives WebSocket events to dispatch raw ESC/POS commands directly to printers.
- **Alternatives**:
  - *Option B*: Client-side browser print dialog (`window.print()`). *Drawback*: Cannot perform silent auto-cut, open cash drawer, or format 58mm/80mm receipt headers reliably.
- **Status**: `PENDING BACKEND AGREEMENT`
- **Responsible Person**: Hardware Integration Engineer / Backend Developer

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

## 3. Decision Sign-Off Summary Table

| ID | Title | Recommendation | Status | Owner |
|---|---|---|---|---|
| D-01 | Auth Mechanism | Bearer JWT Header | Pending | Backend Lead |
| D-02 | QR Security | Ephemeral Signed JWT Session | Pending | Backend + Frontend |
| D-03 | Stock Deduction Timing | On KOT Creation (`KOT_CREATED`) | Pending | Backend + Ops |
| D-04 | KOT Station Split | Single KOT with station tags | Pending | Backend + Chef |
| D-05 | Room Charge Folio | Asynchronous PMS Adapter | Pending | Systems Integrator |
| D-06 | Hardware Printing | Backend Queue + LAN Print Agent | Pending | Hardware Lead |
| D-07 | Multi-Tenancy | `tenant_id` on all tables | Pending | DB Architect |
| D-08 | Tax & Service Charge | CGST 2.5% + SGST 2.5% + 5% SC | Pending | Finance Lead |
