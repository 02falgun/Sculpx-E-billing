# Restro E-Billing & QR Dining Platform (SCULPX)

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Fastify v5](https://img.shields.io/badge/Fastify-v5.2.1-black?style=for-the-badge&logo=fastify)](https://fastify.dev/)
[![Prisma ORM](https://img.shields.io/badge/Prisma_ORM-v6.19.3-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=for-the-badge&logo=postgresql)](https://supabase.com/)
[![React 19](https://img.shields.io/badge/React-19.3.0-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3.3-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-141_Tests_Passing-6E9F18?style=for-the-badge&logo=vitest)](https://vitest.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-purple?style=for-the-badge&logo=pwa)](https://web.dev/progressive-web-apps/)

An enterprise, production-grade **Hotel & Restaurant QR-Based Dining, Waiter POS, Paperless Kitchen Display System (KDS), Central Cashier Billing Desk, and Administrative Back-Office Platform** built with **Next.js App Router**, **Fastify v5**, **Prisma ORM v6**, and **Supabase PostgreSQL**.

Designed with clean architecture and strict tenant isolation: supports a dual-mode service layer with an interactive mock API switch (`NEXT_PUBLIC_USE_MOCK_API`) and a production-ready Fastify microservice backend.

---

## 🏗️ Architecture & Technology Stack

### Frontend Application (`/`)
- **Framework**: Next.js 16.4 (App Router, Turbopack)
- **Language**: TypeScript 6.0 (Strict mode, zero `any`)
- **Styling**: Tailwind CSS 4.3 (Custom HSL theme tokens, dark mode KDS)
- **State Management**:
  - **Server Cache**: TanStack React Query v5
  - **Client State**: Zustand v5 (Persisted cart, UI drawer, POS draft)
- **Form Validation**: React Hook Form v7 + Zod v3
- **Testing**: Vitest v4 + React Testing Library + Playwright E2E

### Backend Microservice (`backend/`)
- **Framework**: Fastify v5 (High throughput, lightweight HTTP router)
- **Database**: PostgreSQL hosted on Supabase
- **ORM & Migrations**: Prisma ORM v6.19.3
- **Security & Auth**: JWT Bearer tokens, `bcryptjs` password hashing, `@fastify/rate-limit` brute-force mitigation
- **Validation**: Strict Zod request schemas for params, queries, and bodies
- **Logging**: Structured Pino logging with automated credential and token redaction
- **Testing**: Vitest with `fastify.inject` (in-memory injection testing)

---

## 🌟 Key Features Across Personas

### 📱 1. Customer Dining Journey
- **Dynamic Table / Room QR Hydration**: Instant deep-linking (`/menu/[qrToken]`) resolving dining location details (Table numbers, sections, guest rooms).
- **Interactive Culinary Catalog**: Category tabs, instant fuzzy search, dietary indicators (Veg, Non-Veg, Vegan, Chef Specials), and spicy heat levels.
- **Modifier & Add-on Hierarchy**: Single-choice and multi-choice modifier groups (portions, dips, bread types, cooking notes) with authoritative server validation.
- **Cart & Slide-over Drawer**: Quantity steppers, instant cart summary, subtotal, 5% GST tax calculation, and persistent storage.
- **Checkout & Order Dispatch**: Zod-validated guest checkout form with flexible payment options (*Pay Now via UPI/Card*, *Pay at Counter*, or *Charge to Room Folio*).
- **Live Order Tracking (`/order/[orderId]`)**: Real-time 5-stage progress timeline (`PLACED` ➔ `CONFIRMED` ➔ `PREPARING` ➔ `READY` ➔ `SERVED`).
- **Official Digital E-Bill (`/bill/[billId]`)**: Itemized GST tax invoice, gratuity selector (5%, 10%, presets, custom), multi-channel payment modal (UPI QR, Card, Cash Desk), verified settlement seal, and instant print/PDF export.

### 🍽️ 2. Waiter POS & Floor Management
- **Visual Floor Tables (`/tables`)**: Live occupancy indicators (`AVAILABLE`, `OCCUPIED`, `RESERVED`, `BILLED`), section filters (Indoor Garden, Main Dining, Terrace Bar, Private Dining), and quick status toggling.
- **High-Velocity Waiter POS (`/pos`)**: Fast dish search, table or guestroom service ticketing, kitchen notes, and instant KOT dispatch.
- **Active Orders Queue (`/orders`)**: Shift-level order monitoring with status filtering and guest search.
- **Central Billing Desk (`/billing`)**: Real-time cashier ledger tracking unsettled tabs, collections, and ESC/POS thermal receipt printing.

### 👨‍🍳 3. Kitchen Display System (KDS)
- **Paperless Touchscreen KDS (`/kitchen`)**: High-contrast, dark-mode kitchen expedite board designed for industrial touch monitors.
- **Live Ticket Timers**: Automatic elapsed minute timers with color-coded urgency thresholds (Normal <10m, Warning 10-15m, Urgent >15m).
- **Line Cook Check-off**: Interactive item-level checkboxes for cooks to strike off prepared items.
- **KOT Lifecycle Progression**: One-touch status advance (`NEW` ➔ `ACCEPTED` ➔ `PREPARING` ➔ `READY` ➔ `SERVED`).

### ⚙️ 4. Admin Back-Office & Hardware Fleet
- **Executive Operations Dashboard (`/admin`)**: Real-time revenue metrics, today's gross sales, floor occupancy percentages, and fleet health.
- **Catalog & 86-ing Inventory Control (`/admin/menu`)**: Instant search, category filters, and live stock toggles (marking dishes 86'd / sold out across all customer menus).
- **Thermal Printer Fleet (`/admin/printers`)**: Real-time ESC/POS hardware printer monitors (Kitchen KOT, Bar, Billing Desk) with paper level indicators and a print job history queue with instant retry.
- **QR Tent Card Generator (`/admin/qr`)**: Dynamic SVG QR code generator with single-table preview and bulk-print formatted tent cards for restaurant table stands.

---

## 🔐 Authentication & Staff Roles Matrix

The platform implements strict role-based access control (RBAC) backed by PostgreSQL and JWT:

| Email | Role | Name | Permissions & Scope |
|---|---|---|---|
| `superadmin@demo.com` | `SUPER_ADMIN` | Kavya Kumar | Multi-property owner, audit logs, system-wide configuration |
| `admin@demo.com` | `ADMIN` | Rajesh Sharma | Menu catalog management, printers, tables, staff users, inventory |
| `manager@demo.com` | `MANAGER` | Vikram Mehta | Shift operations, bill voids, refund authorization, reports |
| `captain@demo.com` | `CAPTAIN` | Karan Verma | Floor captain, order escalations, table status overrides |
| `waiter@demo.com` | `WAITER` | Rahul Sharma | Table orders, POS entries, customer bill requests |
| `cashier@demo.com` | `CASHIER` | Pooja Verma | Billing ledger, settlements (Cash, Card, UPI, Room Charge) |
| `kitchen@demo.com` | `KITCHEN_STAFF` | Chef Sanjeev | Touchscreen KDS board, ticket status progression |

*(Demo account password: `demo-secure-pass`)*

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js `v22+` or `v25+`
- npm `v10+`
- PostgreSQL instance (or Supabase project)

### 2. Frontend Setup
```bash
# Clone the repository
git clone https://github.com/02falgun/Sculpx-E-billing.git
cd Sculpx-E-billing

# Install root dependencies
npm install

# Start Next.js development server
npm run dev
# Frontend runs at: http://localhost:3000
```

### 3. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Install backend dependencies
npm install

# Generate Prisma Client
npm run prisma:generate

# Seed staff demonstration accounts (idempotent)
npm run db:seed

# Start backend in development mode
npm run dev
# Backend runs at: http://localhost:8000
```

---

## 🧪 Verification & Testing

The workspace enforces strict quality gates with 141 automated tests passing across 38 suites:

```bash
# --- Backend Verification (backend/) ---
cd backend
npm run prisma:validate   # Validate Prisma schema
npm run typecheck         # Type check backend (tsc --noEmit)
npm test                  # Run 48 backend tests (health, readiness, auth, menu catalog)
npm run build             # Verify production build (rimraf dist && tsc)

# --- Root Frontend Verification (root /) ---
cd ..
npm run typecheck         # Strict Next.js TypeScript typecheck
npm run lint              # ESLint check
npm test                  # Run full test suite (141 tests total)
npm run build             # Build production Next.js bundle
```

---

## 📚 Architectural Documentation

Comprehensive engineering documentation is available in the [`docs/`](./docs) directory:

| Document | Purpose |
| :--- | :--- |
| [docs/API_CONTRACTS.md](./docs/API_CONTRACTS.md) | Exhaustive REST endpoint contracts, envelopes, and status matrix |
| [docs/DATA_MODELS.md](./docs/DATA_MODELS.md) | PostgreSQL schema, Prisma models, indexes, and relations |
| [docs/BACKEND_IMPLEMENTATION_STATUS.md](./docs/BACKEND_IMPLEMENTATION_STATUS.md) | Phase-by-phase backend implementation progress and test log |
| [docs/INTEGRATION_CHECKLIST.md](./docs/INTEGRATION_CHECKLIST.md) | Stage-by-stage frontend-to-backend integration acceptance checklist |
| [docs/BUSINESS_RULES.md](./docs/BUSINESS_RULES.md) | Validation invariants, tax rules, discount limits, and transactions |
| [docs/WEBSOCKET_CONTRACT.md](./docs/WEBSOCKET_CONTRACT.md) | Real-time WebSocket event schemas and pub/sub channels |
| [docs/VPS_INTEGRATION.md](./docs/VPS_INTEGRATION.md) | Production deployment guide, Nginx reverse proxy, and systemd |
| [backend/README.md](./backend/README.md) | Dedicated Fastify backend architecture and operating guide |

---

## 📄 License
UNLICENSED — Proprietary hotel restaurant operations platform.

