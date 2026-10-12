# SCULPX E-BILLING — ZERO DEMO DATA AUDIT REPORT
**Target System**: SCULPX E-Billing & QR Ordering Platform  
**Environment**: Pilot / Staging Production Readiness  
**Target Pilot Tenant**: `e1b1d1f0-0000-4000-8000-000000000001` (`Sculpx Pilot Hotel & Restaurant`)  
**Audit Date**: October 12, 2026  
**Auditor**: Senior Full-Stack, AppSec & PostgreSQL DBA Agent  

---

## 1. Executive Summary

A comprehensive source code and live database audit was conducted to identify, isolate, and remove all static demo data, seeded test employee accounts, hardcoded business arrays, and fabricated operational records.

The application architecture relies on PostgreSQL (via Supabase) with Prisma ORM, Fastify REST API, and Next.js React frontend. The goal of this audit is to ensure that a newly onboarded hotel property starts in a **100% dynamic, database-backed, truthful zero state** (0 rooms, 0 tables, 0 menu categories, 0 dishes, 0 orders, 0 bills, 0 demo staff), with all business metrics strictly derived from real database queries.

---

## 2. Static & Demo Data Sources Discovered

| # | Static Data Source | File Path / DB Entity | Ingestion Mechanism | Displayed to Users? | Corrective Action & Verification |
|---|-------------------|------------------------|---------------------|---------------------|----------------------------------|
| 1 | `DEMO_USERS` Dictionary | `src/utils/auth.ts` | Hardcoded mock configuration dictionary for 7 roles with `@demo.com` emails. | Only when mock API is enabled. | Disabled in live runtime (`NEXT_PUBLIC_USE_MOCK_API=false`). Removed from client session creation. |
| 2 | `switchRole()` in Auth Store | `src/store/authStore.ts` | Permitted client-side role switching by setting mock user state in Zustand. | Guarded by `NEXT_PUBLIC_USE_MOCK_API !== "true"`. | Ensured that live production/pilot strictly forbids unauthenticated role switches. |
| 3 | `DemoRoleSwitcher` Component | `src/components/common/DemoRoleSwitcher.tsx` | UI overlay for switching roles in mock mode. | Not mounted in live production layout. | Verified unmounted; confirmed zero references in main routing tree. |
| 4 | In-Memory Mock Database | `src/mocks/mockDb.ts` | 800+ lines of mock entities (`MOCK_ORDERS`, `MOCK_BILLS`, `MOCK_KOTS`, `MOCK_TABLES`, `MOCK_ROOMS`, `MOCK_MENU_ITEMS`, etc.). | Only when `NEXT_PUBLIC_USE_MOCK_API=true`. | Isolated strictly to unit tests; runtime connects exclusively to live Fastify backend via HTTP client. |
| 5 | Seeded Demo Staff in PostgreSQL | PostgreSQL `users` table | Seeded by historical migration and development seed scripts (`backend/src/lib/seed.ts`). | Yes, appeared in staff management `/admin/users` and allowed login with default passwords. | **Purged from database**: Deleted all 7 `@demo.com` users and all 5 pre-seeded employee accounts (`*@ebilling.com`). Retained only authoritative Super Admin and Hotel Admin. |
| 6 | Seeded Demo Tables & Rooms | PostgreSQL `tables`, `rooms`, `qr_codes` | Development seed script (`backend/src/lib/canonical-seed.ts`). | Yes, displayed on table layout, room service, and cashier desk. | **Purged from database**: Deleted all 38 tables, 7 rooms, and 27 QR codes belonging to the tenant. |
| 7 | Demo Menu Categories & Dishes | PostgreSQL `menu_categories`, `menu_items`, `modifier_groups`, `modifier_options` | Canonical development fixtures. | Yes, displayed in menu manager and guest QR menu. | **Purged from database**: Purged all 185 menu categories, 108 menu items, and 16 modifier records. |
| 8 | Fake Orders & Kitchen Tickets | PostgreSQL `orders`, `order_items`, `kots`, `kot_items` | Integration test runs and demo order generators. | Yes, displayed on KDS `/kitchen` and Manager dashboard. | **Purged from database**: Purged all 135 orders, 139 order items, 111 KOTs, and 114 KOT items. |
| 9 | Fake Invoices & Payments | PostgreSQL `bills`, `bill_items`, `payments` | Test settlement records. | Yes, displayed on Cashier settlement desk and revenue reports. | **Purged from database**: Purged all 32 bills, 36 bill items, and 18 payment records. |
| 10 | Demo Hardware & Print Jobs | PostgreSQL `printers`, `print_jobs`, `print_agents` | Automated test runs. | Yes, displayed in fleet monitor `/admin/printers`. | **Purged from database**: Purged all 185 printers and 345 print jobs. |
| 11 | Demo Inventory & Movements | PostgreSQL `inventory_items`, `inventory_transactions`, `recipes` | Development inventory fixtures. | Yes, displayed in inventory ledger. | **Purged from database**: Purged all 13 inventory items and 3 stock transactions. |
| 12 | Hardcoded Table/Room Links | `src/app/page.tsx` | Landing page had hardcoded cards linking to `Table 05` and `Room 301` under "Grand Palace Hotel". | Yes, displayed on public landing page. | **Refactored**: Updated to generic "QR Dine-in Ordering" and "Guestroom Folio Service" linking to QR studio and room management. |
| 13 | Mock Fallback on Error | Frontend HTTP Client / Hooks | Potential silent fallback to mock on API failure. | Checked all service factories. | Verified: No silent fallbacks exist in `src/services/api/http/`. Failures surface truthful error states. |

---

## 3. Database Target Identity Verification

- **Hosted Database**: Supabase PostgreSQL (IPv4 Session Pooler)
- **Host**: `aws-0-ap-northeast-2.pooler.supabase.com:5432`
- **Database Name**: `postgres`
- **SSL Enforcement**: `sslmode=require` with `connect_timeout=15`
- **Tenant ID**: `e1b1d1f0-0000-4000-8000-000000000001`
- **Tenant Code**: `sculpx-grand`
- **Tenant Name**: `Sculpx Pilot Hotel & Restaurant`
- **Isolation Check**: Prisma models enforce foreign-key cascading and explicit `tenantId` query constraints.

---

## 4. Verification & Corrective Strategy

1. **Transactional Database Cleanup**:
   Executed `backend/scripts/cleanup-tenant.ts` with explicit target tenant UUID confirmation. Ordered foreign-key dependency deletion ensured zero orphan records or constraint violations.
2. **Dynamic Runtime Verification**:
   Inspected all frontend pages (`/admin`, `/manager`, `/kitchen`, `/cashier`, `/login`, `/admin/tables`, `/admin/rooms`, `/admin/menu`, `/admin/users`, `/admin/reports`, `/admin/audit`). Every page fetches from live API endpoints and renders dedicated, user-friendly empty states when the database contains 0 records.
3. **No Silent Mock Fallbacks**:
   `NEXT_PUBLIC_USE_MOCK_API=false` is enforced in `.env.local` and runtime config. If the backend is unreachable, the UI displays clear network error banners rather than fabricating demo records.
