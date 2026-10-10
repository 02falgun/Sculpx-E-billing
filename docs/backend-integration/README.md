# SCULPX E-Billing — Backend Integration Documentation Hub

This directory contains the authoritative technical specifications, API contracts, database handover schemas, business rules, and integration checklists for connecting the **SCULPX E-Billing** frontend with the **Node.js + PostgreSQL backend on the VPS**.

---

## Master Document Index

| Document | Primary Audience | Description |
|---|---|---|
| [**`FRONTEND_BACKEND_HANDOVER.md`**](../FRONTEND_BACKEND_HANDOVER.md) | Lead Backend Engineer / Architect | Master handover document covering architecture, modules, auth, and integration roadmap. |
| [**`API_CONTRACTS.md`**](../API_CONTRACTS.md) | Backend API Developers | Complete REST endpoint matrix, request/response JSON schemas, headers, and error codes. |
| [**`DATA_MODELS.md`**](../DATA_MODELS.md) | Database Architect | PostgreSQL 15 DDL, ER diagram, relationships, constraints, and audit logging tables. |
| [**`BUSINESS_RULES.md`**](../BUSINESS_RULES.md) | Backend & Product Leads | State machines, validation invariants, transaction boundaries, and pending agreements. |
| [**`WEBSOCKET_EVENTS.md`**](../WEBSOCKET_EVENTS.md) | Realtime Socket Engineer | Wire frames, channel subscriptions, event payloads, deduplication, and reconnection backoff. |
| [**`ENVIRONMENT_SETUP.md`**](../ENVIRONMENT_SETUP.md) | DevOps / Full-Stack | Environment variables, `.env.local` vs VPS configuration, and security rules. |
| [**`INTEGRATION_CHECKLIST.md`**](../INTEGRATION_CHECKLIST.md) | QA Lead / Integration Team | Actionable stage-by-stage verification checklist with concrete acceptance criteria. |
| [**`OPEN_DECISIONS.md`**](../OPEN_DECISIONS.md) | Backend Architect & Product Lead | Register of 8 key decisions requiring explicit backend agreement before live cutover. |

---

## Supporting Infrastructure Guides

- [**`VPS_INTEGRATION.md`**](../VPS_INTEGRATION.md) — Nginx reverse proxy configuration, WSS upgrade blocks, and CORS headers.
- [**`AUTHENTICATION_AND_AUTHORIZATION.md`**](../AUTHENTICATION_AND_AUTHORIZATION.md) — Dual-track customer vs staff JWT lifecycle.
- [**`ORDER_AND_KITCHEN_WORKFLOWS.md`**](../ORDER_AND_KITCHEN_WORKFLOWS.md) — KDS ticket state progression and elapsed timers.
- [**`BILLING_AND_PAYMENT_CONTRACT.md`**](../BILLING_AND_PAYMENT_CONTRACT.md) — Invoice generation, split payments, and refunds.
- [**`PRINTER_INTEGRATION.md`**](../PRINTER_INTEGRATION.md) — ESC/POS hardware thermal printing queue.
