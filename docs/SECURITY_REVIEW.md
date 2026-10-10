# SCULPX E-Billing — Security & Multi-Tenancy Review

> **Audience**: Backend Security Lead, System Architect  
> **Status**: Architectural Security Review & Tenancy Assumptions  

---

## 1. Multi-Tenancy Assumption & Flag for Confirmation

> [!IMPORTANT]
> **Current Architectural Assumption**:
> The frontend UI and data models assume a **single hotel / property deployment per instance by default**, while including explicit `tenant_id` fields in data models and API headers to allow easy multi-tenant SaaS expansion.
> 
> **Action Required**: The backend developer and property owner must confirm whether this deployment is:
> - **Option A (Recommended)**: Single-Tenant dedicated instance per hotel property (simplest, maximum data isolation).
> - **Option B**: Multi-Tenant shared database with row-level security (`tenant_id`).

---

## 2. Authentication Boundaries & Session Security

1. **Token Storage**:
   - Access tokens are kept in browser client storage for SPA station access.
   - For higher security environments, the backend developer may choose HttpOnly, SameSite=Strict cookies for the `/auth` endpoints.
2. **Token Invalidation on Logout**:
   - `POST /auth/logout` must invalidate the token on the server (e.g. Redis blocklist or session table deletion) so stolen tokens cannot continue operating.
3. **No Database Secrets in Client**:
   - The frontend repository contains zero database passwords, API gateway secret keys, or privileged service credentials.

---

## 3. Public QR Endpoint Hardening

1. **Zero Privileged Data in QR URLs**:
   - QR URLs contain only the public identifier (e.g. `/menu/table/T01`).
   - QR scanning does not grant staff permissions.
2. **Rate Limiting**:
   - Public endpoints (`/menu/context/:token`, `POST /orders`, `POST /orders/validate`) must be rate-limited by IP / session on the backend (e.g., maximum 30 requests/minute) to prevent catalog scraping or automated order spamming.
3. **Table Impersonation Prevention**:
   - The backend checks whether the target table already has an active order or is vacant before accepting orders.

---

## 4. Input Validation & Injection Defenses

1. **Client Zod Schemas**:
   - All forms (`CheckoutForm`, `PaymentModal`, `ModifierModal`) validate through Zod schemas before network dispatch.
2. **Authoritative Backend Validation**:
   - The backend must never trust client-side validation alone. All inputs must be strictly validated against server schemas before database insertion.
3. **SQL Injection Defense**:
   - All database queries on the Node.js backend must utilize parameterized queries or a trusted ORM/query builder (e.g., Knex, Prisma, Drizzle). Raw SQL string concatenation is strictly prohibited.

---

## 5. Payment Security & PCI-DSS Scoping

1. **Zero Cardholder Data (CHD)**:
   - The frontend never reads, transmits, or stores full Primary Account Numbers (PAN), CVVs, or card PINs.
   - For demo cards, the frontend uses masked dummy strings (`4532 •••• •••• 8891`).
   - For real card processing, the client loads the certified gateway iframe/SDK (e.g. Razorpay Standard Checkout).
2. **Webhook Verification**:
   - Payment settlement relies solely on backend webhook verification using cryptographic HMAC signatures with the gateway secret.
