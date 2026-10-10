# SCULPX E-Billing — Backend Handover Checklist & Sign-Off Matrix

> **Audience**: Project Leads, Technical Architect, Backend Developer, QA Lead  
> **Status**: Formal Handoff Package Verification Document  

---

## 1. Frontend Integration Readiness (Complete & Verified)

- [x] **Route Inventory Catalogued**: Every App Router route, layout, and component mapped in [`docs/ROUTE_INVENTORY.md`](./ROUTE_INVENTORY.md).
- [x] **Role Workspaces Documented**: Customer, Waiter, Kitchen, Cashier, Manager, and Admin workflows detailed in [`docs/ROLE_ARCHITECTURE.md`](./ROLE_ARCHITECTURE.md).
- [x] **Integration Matrix Mapped**: Complete matrix linking every screen to hooks, endpoints, schemas, and events in [`docs/BACKEND_INTEGRATION_MATRIX.md`](./BACKEND_INTEGRATION_MATRIX.md).
- [x] **Service Layer Standardized**: Dual-track service factory (`src/services/api/factory.ts`) cleanly switching between mock and concrete HTTP services based on `NEXT_PUBLIC_USE_MOCK_API`.
- [x] **Concrete HTTP Client Layer Created**: Implemented 11 concrete HTTP service classes in `src/services/api/http/` wired to `ApiClient`.
- [x] **Automatic Bearer Token Injection**: Implemented in `src/services/api/client.ts` to attach JWT tokens to all staff API calls automatically.
- [x] **Environment Variables Documented**: Clean template in [`.env.example`](../.env.example) and complete setup guide in [`docs/ENVIRONMENT_SETUP.md`](./ENVIRONMENT_SETUP.md).
- [x] **Canonical Base URL for QR Codes**: `ENV.APP_URL` configured so QR links never hardcode localhost in production.
- [x] **Loading, Empty, & Error States**: Standard UI components (`Spinner`, `EmptyState`, `RoleGuard`, error boundaries) active across all screens.
- [x] **Automated Test Suite Verified**: 33 test files, 90 automated unit and component tests passing with 100% green status.
- [x] **Zero TypeScript & Lint Errors**: Strict `tsc --noEmit` and `eslint .` passes with zero errors or warnings.
- [x] **Production Build Verified**: `next build` generates 44 static/dynamic routes in Turbopack successfully.

---

## 2. Backend Contract Alignment (Requires Backend Developer Agreement)

- [ ] **REST API Base URL Agreed**: Proposed as `/api/v1` (configurable via `NEXT_PUBLIC_API_URL`).
- [ ] **Authentication Mechanism Agreed**: Proposed as Bearer JWT header in `Authorization: Bearer <token>`.
- [ ] **Role & Permission Model Agreed**: 7 staff roles (`SUPER_ADMIN`, `ADMIN`, `MANAGER`, `CAPTAIN`, `WAITER`, `CASHIER`, `KITCHEN_STAFF`).
- [ ] **Request / Response Envelope Agreed**: Standard `{ "success": boolean, "data": T, "error": { "code", "message" } }` format agreed.
- [ ] **Pagination Standard Agreed**: Query parameters `page` (1-indexed) and `limit` with `{ items, pagination }` response envelope.
- [ ] **Currency & Decimals Agreed**: ISO code `INR`, standard Indian Rupee symbol `₹`, stored as `NUMERIC(10, 2)` in PostgreSQL.
- [ ] **Date/Time Standard Agreed**: ISO 8601 UTC strings (`2026-10-10T15:00:00.000Z`).
- [ ] **WebSocket Wire Protocol Agreed**: JSON frames with `{ id, type, topic, payload, timestamp }`.

---

## 3. Data Models & Business Rules (Requires Backend Developer Agreement)

- [ ] **PostgreSQL Schema Reviewed**: Detailed DDL reviewed in [`docs/DATA_MODELS.md`](./DATA_MODELS.md).
- [ ] **Order vs. Bill Boundary Verified**: Order and Bill treated as distinct database entities.
- [ ] **Order & KOT Lifecycle Transitions Confirmed**: Verified against [`docs/ORDER_AND_KITCHEN_WORKFLOWS.md`](./ORDER_AND_KITCHEN_WORKFLOWS.md).
- [ ] **Cancellation & Inventory Policy Confirmed**: Raw items restored if cancelled before cooking; flagged as `WASTAGE` if cancelled during/after cooking.
- [ ] **Indian GST Calculation Formula Confirmed**: CGST 2.5% + SGST 2.5% + optional 5% service charge.
- [ ] **Hardware Print Architecture Confirmed**: Backend print queue with local ESC/POS gateway agent.

---

## 4. VPS Deployment Readiness (Requires Backend Developer Action)

- [ ] **Production API Base URL Supplied**: Value: `_________________________________`
- [ ] **Production WebSocket URL Supplied**: Value: `_________________________________`
- [ ] **Health Endpoint Available**: e.g., `https://api.yourdomain.com/health` returns `200 OK`.
- [ ] **CORS Origin Whitelisted**: Configured on VPS reverse proxy/Node.js server for the frontend origin.
- [ ] **HTTPS / WSS SSL Certificates Active**: Verified via Let's Encrypt / Certbot.
- [ ] **Seed Data Inserted**: Initial menu catalog, categories, tables, and demo staff loaded into PostgreSQL.
- [ ] **Live Integration Verified**: At least one end-to-end login, order placement, and KOT progression tested against the VPS.
