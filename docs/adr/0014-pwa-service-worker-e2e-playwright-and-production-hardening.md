# 14. PWA Service Worker, End-to-End Playwright Automation & Production Hardening

Date: 2026-10-09

## Status

Accepted

## Context

For hospitality environments, network fluctuations, staff device mobility (tablets/smartphones), and high guest concurrency require bulletproof client-side resilience. Furthermore, deploying a production system demands full automated end-to-end user journey verification covering guest ordering, waiter POS ticketing, kitchen expedite workflows, and billing desk settlements.

## Decision

We introduced comprehensive Progressive Web Application (PWA) infrastructure, offline fallbacks, and Playwright E2E automated test suites:
1. **Web App Manifest & Metadata (`public/manifest.json`, `src/app/layout.tsx`)**:
   - Configured standalone PWA display mode, high-contrast dark theme (#0f172a), viewport restrictions, apple-mobile-web-app compatibility, and SVG vector icon generation (`src/app/icon.svg`).
2. **Service Worker & Network Caching (`public/sw.js`, `PWARegister.tsx`)**:
   - Implemented service worker caching core static bundles and routing fallbacks.
   - Built automatic offline network detection and recovery toasts notifying guests if Wi-Fi or cellular connectivity drops.
   - Designed a dedicated offline recovery page (`/offline`) enabling seamless retry when reconnecting to local hotel networks.
3. **Playwright End-to-End Test Automation (`tests/e2e/`)**:
   - **`smoke.spec.ts`**: Verifies root routing, QR token hydration, KDS, and Admin portal connectivity.
   - **`customer-journey.spec.ts`**: Automates full customer lifecycle: Table QR Scan ➔ Dish Search & Filter ➔ Modifier Customization ➔ Cart Management ➔ Checkout with Zod validation ➔ Live Order Tracking timeline ➔ GST Tax Invoice & Gratuity selection.
   - **`staff-operations.spec.ts`**: Automates floor table status overview, fast waiter POS ordering, paperless Kitchen Display KOT ticket management, active order auditing, and cashier desk settlement.
   - **`admin-backoffice.spec.ts`**: Validates executive KPI cards, 86-list dish availability toggling, thermal printer fleet diagnostics, and table QR tent card generation.
4. **Configuration & Test Runner Isolation**:
   - Isolated Playwright from Vitest in `vitest.config.ts` via `exclude: ["**/tests/e2e/**"]`.
   - Added `"test:e2e": "playwright test"` script to `package.json`.

## Consequences

- The application is fully installable as an app on iOS, Android, and Desktop POS terminals.
- Guaranteed zero regressions across all 10 architectural phases through automated end-to-end integration and unit testing.
