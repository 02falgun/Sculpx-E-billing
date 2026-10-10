# SCULPX E-Billing — Master Documentation & Handover Package

Welcome to the **SCULPX E-Billing & Hospitality POS** documentation package. This comprehensive directory contains full technical specifications, API contracts, PostgreSQL data models, state machines, and handover checklists prepared specifically for the backend engineering team implementing the Node.js REST API and PostgreSQL database on the configured VPS.

---

## 📑 Master Backend Handover Directory

### 1. High-Level Overviews & Architecture
- [**FRONTEND_BACKEND_HANDOVER.md**](./FRONTEND_BACKEND_HANDOVER.md): **Master handover specification** covering full system architecture, modules, auth, and roadmap.
- [**PROJECT_OVERVIEW.md**](./PROJECT_OVERVIEW.md): Executive summary, unified QR model, personas, and authority boundaries.
- [**FRONTEND_ARCHITECTURE.md**](./FRONTEND_ARCHITECTURE.md): Unidirectional data flow, dual-track service factory, state architecture.
- [**ROLE_ARCHITECTURE.md**](./ROLE_ARCHITECTURE.md): User roles, permission matrix, station access, and route guards.
- [**ROUTE_INVENTORY.md**](./ROUTE_INVENTORY.md): Comprehensive inventory of all 44 Next.js App Router screens and layouts.

### 2. Integration Matrices & Contracts
- [**API_CONTRACTS.md**](./API_CONTRACTS.md): **Master REST API specification** with complete endpoint matrix, JSON schemas, headers, status codes, and curl examples.
- [**WEBSOCKET_EVENTS.md**](./WEBSOCKET_EVENTS.md): **Authoritative realtime event bus catalog**, wire formats, topic subscriptions, and deduplication logic.
- [**BUSINESS_RULES.md**](./BUSINESS_RULES.md): **Business invariants, state machines**, transaction boundaries, and pending agreement markers.
- [**OPEN_DECISIONS.md**](./OPEN_DECISIONS.md): **Register of 8 critical architectural decisions** requiring backend developer agreement.
- [**INTEGRATION_CHECKLIST.md**](./INTEGRATION_CHECKLIST.md): **Stage-by-stage acceptance criteria** and actionable integration verification checklist.
- [**BACKEND_INTEGRATION_MATRIX.md**](./BACKEND_INTEGRATION_MATRIX.md): Master feature-by-feature integration matrix linking screens to endpoints, schemas, and WS events.
- [**BILLING_AND_PAYMENT_CONTRACT.md**](./BILLING_AND_PAYMENT_CONTRACT.md): GST tax calculations, payment methods, receipts, and refund contracts.
- [**ORDER_AND_KITCHEN_WORKFLOWS.md**](./ORDER_AND_KITCHEN_WORKFLOWS.md): Order and KOT state machines, transition authority, and cancellation propagation.

### 3. Data Models & Business Logic
- [**DATA_MODELS.md**](./DATA_MODELS.md): Conceptual entity relationships, PostgreSQL DDL schemas, indexes, and Mermaid ER diagram.
- [**DATABASE_HANDOVER.md**](./DATABASE_HANDOVER.md): Schema lifecycle, migrations, transaction boundaries, and realistic seed datasets.
- [**INVENTORY_HANDOVER.md**](./INVENTORY_HANDOVER.md): Ingredient-level tracking, recipe bill-of-materials (BOM), and stock deduction policies.
- [**PRINTER_INTEGRATION.md**](./PRINTER_INTEGRATION.md): ESC/POS thermal printing architecture, print queues, retries, and hardware agents.
- [**QR_SYSTEM.md**](./QR_SYSTEM.md): Table & room QR generation, canonical URLs, token resolution, and high-res SVG export.

### 4. Operations, Security & Testing
- [**AUTHENTICATION_AND_AUTHORIZATION.md**](./AUTHENTICATION_AND_AUTHORIZATION.md): JWT token lifecycle, session expiration, and zero-trust backend enforcement.
- [**SECURITY_REVIEW.md**](./SECURITY_REVIEW.md): Multi-tenancy assumptions, injection defenses, PCI-DSS scoping, and rate limiting.
- [**ENVIRONMENT_SETUP.md**](./ENVIRONMENT_SETUP.md): Local development vs. production VPS environment configuration.
- [**ERROR_HANDLING.md**](./ERROR_HANDLING.md): Unified error envelopes, UI toast notifications, and idempotency safeguards.
- [**VPS_INTEGRATION.md**](./VPS_INTEGRATION.md): VPS deployment prerequisites, Nginx reverse proxy, CORS headers, and WSS upgrades.
- [**BACKEND_INTEGRATION_TEST_PLAN.md**](./BACKEND_INTEGRATION_TEST_PLAN.md): End-to-end integration test matrix covering Customer, Waiter, Kitchen, Cashier, and Admin.
- [**BACKEND_HANDOVER_CHECKLIST.md**](./BACKEND_HANDOVER_CHECKLIST.md): Sign-off matrix classifying completed deliverables, backend agreements, and deployment action items.

---

## 🏛️ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run local development (operates in mock mode by default)
npm run dev

# 3. Verify TypeScript types
npm run typecheck

# 4. Run automated test suite (Vitest)
npm run test

# 5. Check code formatting & linting
npm run lint

# 6. Verify production build
npm run build
```
