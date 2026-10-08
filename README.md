# Restro E-Billing & QR Dining Platform

[![Next.js 16](https://img.shields.io/badge/Next.js-16.4.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.3.0-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3.3-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E_Verified-2EAD33?style=for-the-badge&logo=playwright)](https://playwright.dev/)
[![Vitest](https://img.shields.io/badge/Vitest-80_Tests_Passing-6E9F18?style=for-the-badge&logo=vitest)](https://vitest.dev/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-purple?style=for-the-badge&logo=pwa)](https://web.dev/progressive-web-apps/)

An enterprise, production-ready, frontend-only **Hotel Restaurant QR-Based Ordering, Waiter POS, Paperless Kitchen Display (KDS), and Digital E-Billing Platform** built with **Next.js App Router**, **TypeScript**, **Tailwind CSS**, **TanStack Query**, **Zustand**, **WebSockets**, and **PWA**.

Designed with clean architecture and strict backend-integration readiness: all mock services implement 1:1 service interfaces, enabling seamless cutover to real REST/GraphQL APIs without refactoring a single UI component.

---

## 🌟 Key Features Across Personas

### 📱 1. Customer Dining Journey
- **Dynamic Table / Room QR Hydration**: Instant deep-linking (`/menu/[qrToken]`) resolving dining location details (Table numbers, sections, guest rooms).
- **Interactive Culinary Catalog**: Category tabs, instant fuzzy search, dietary indicators (Veg, Non-Veg, Vegan, Chef Specials), and spicy heat levels.
- **Modifier & Add-on Modal**: Single-choice and multi-choice modifier groups (portions, bread types, dips, cooking notes) with real-time price calculations and minimum validation rules.
- **Cart & Slide-over Drawer**: Quantity steppers, instant cart summary, subtotal, 5% GST tax calculation, and persistent storage.
- **Checkout & Order Dispatch**: Zod-validated guest checkout form with flexible payment options (*Pay Now via UPI/Card*, *Pay at Counter*, or *Charge to Room Folio*).
- **Live Order Tracking (`/order/[orderId]`)**: Real-time 5-stage progress timeline (`PLACED` ➔ `CONFIRMED` ➔ `PREPARING` ➔ `READY` ➔ `SERVED`) driven by WebSocket simulation and estimated cooking countdowns.
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

### 📶 5. Progressive Web App (PWA) & Offline Resilience
- **Standalone App Experience**: Installable on iOS, Android, and Desktop POS screens with high-contrast theme (`#0f172a`).
- **Offline Service Worker (`public/sw.js`)**: Caches critical application shells and static bundles.
- **Offline Fallback Route (`/offline`)**: User-friendly connection recovery screen with automatic online/offline status toasts.

---

## 🗺️ Application Route Matrix

| Route | Role | Description |
| :--- | :--- | :--- |
| `/` | Public | Dining table / room QR selection landing portal |
| `/menu/[qrToken]` | Customer | Digital menu with filters, search, and modifiers |
| `/cart` | Customer | Full-page shopping cart & order review |
| `/checkout` | Customer | Guest details form & payment preference selection |
| `/order/[orderId]` | Customer | 5-stage live order tracking with WebSocket timeline |
| `/bill/[billId]` | Customer / Cashier | GST tax invoice, tip selector & digital payment portal |
| `/tables` | Waiter / Captain | Real-time floor plan layout & table occupancy |
| `/pos` | Waiter / Staff | High-speed waiter POS ordering terminal |
| `/orders` | Staff / Manager | Active restaurant orders queue and lifecycle audit |
| `/kitchen` | Kitchen Crew | Touchscreen Kitchen Display System (KDS) & KOT tickets |
| `/billing` | Cashier | Central billing desk, unsettled tabs & receipt printing |
| `/admin` | Manager / Admin | Executive KPI dashboard & revenue metrics |
| `/admin/menu` | Manager / Admin | Culinary catalog manager & 86-list availability |
| `/admin/printers` | Manager / IT | ESC/POS thermal printer fleet & print job history |
| `/admin/qr` | Manager / Admin | Dynamic SVG QR code generator & printable tent cards |
| `/offline` | System | PWA offline fallback and connection recovery |

---

## 🛠️ Technology Stack

- **Framework**: Next.js 16.4 (App Router, Turbopack)
- **Language**: TypeScript 6.0 (Strict mode, zero `any`)
- **Styling**: Tailwind CSS 4.3 (Custom HSL theme tokens, dark mode KDS)
- **State Management**:
  - **Server Cache**: TanStack React Query v5
  - **Client State**: Zustand v5 (Persisted cart, UI drawer, POS draft)
- **Form Validation**: React Hook Form v7 + Zod v3
- **Icons**: Lucide React
- **Real-Time Layer**: WebSocket mock engine with pub/sub architecture
- **Testing**:
  - **Unit & Component**: Vitest v4 + React Testing Library + Jest DOM
  - **End-to-End**: Playwright Test (Chromium, Mobile Chrome, Mobile Safari)
- **Code Quality**: ESLint 9 + Prettier

---

## 🚀 Quick Start

### Prerequisites
- Node.js `v20+` or `v25+`
- npm `v10+`

### Installation
```bash
# Clone the repository
git clone https://github.com/02falgun/Sculpx-E-billing.git
cd Sculpx-E-billing

# Install dependencies
npm install
```

### Running Locally
```bash
# Start Next.js development server
npm run dev

# Open in browser
open http://localhost:3000
```

### Quick Demo QR Links
- **Table 1 (Indoor Garden)**: `http://localhost:3000/menu/table-token-1`
- **Table 5 (Main Dining - Active Order)**: `http://localhost:3000/menu/table-token-5`
- **Room 301 (Suite)**: `http://localhost:3000/menu/room-token-301`
- **Kitchen Display**: `http://localhost:3000/kitchen`
- **Floor Tables**: `http://localhost:3000/tables`
- **Waiter POS**: `http://localhost:3000/pos`
- **Billing Desk**: `http://localhost:3000/billing`
- **Admin Dashboard**: `http://localhost:3000/admin`

---

## 🧪 Verification & Testing

Every delivery phase enforces strict quality gates:

```bash
# 1. Typecheck (TypeScript strict mode)
npm run typecheck

# 2. Linting (ESLint)
npm run lint

# 3. Unit & Component Tests (Vitest: 31 suites, 80 tests)
npm run test

# 4. End-to-End Tests (Playwright: 4 suites, 7 tests)
npm run test:e2e -- --project=chromium

# 5. Production Build Verification
npm run build
```

---

## 📚 Architectural Documentation

Comprehensive engineering documentation is available in the [`docs/`](./docs) directory:

| Document | Purpose |
| :--- | :--- |
| [docs/PROJECT_OVERVIEW.md](./docs/PROJECT_OVERVIEW.md) | Business scope, personas, and system boundaries |
| [docs/FRONTEND_ARCHITECTURE.md](./docs/FRONTEND_ARCHITECTURE.md) | Layered UI architecture and data flow |
| [docs/API_CONTRACT.md](./docs/API_CONTRACT.md) | Canonical REST contract and envelopes |
| [docs/WEBSOCKET_CONTRACT.md](./docs/WEBSOCKET_CONTRACT.md) | Real-time WebSocket event schemas |
| [docs/BACKEND_INTEGRATION.md](./docs/BACKEND_INTEGRATION.md) | Production backend cutover instructions |
| [docs/PRINTER_INTEGRATION.md](./docs/PRINTER_INTEGRATION.md) | ESC/POS thermal printer integration architecture |
| [docs/PWA.md](./docs/PWA.md) | Service worker, manifest, and offline strategy |
| [docs/adr/](./docs/adr/) | 14 Architecture Decision Records (ADRs) |
| [docs/CHANGELOG.md](./docs/CHANGELOG.md) | Full phased release changelog |

---

## 📄 License
UNLICENSED — Proprietary hotel restaurant operations platform.
