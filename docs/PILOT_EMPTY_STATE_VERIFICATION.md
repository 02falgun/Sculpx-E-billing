# SCULPX E-BILLING — PILOT EMPTY STATE & RUNTIME VERIFICATION
**Date**: October 12, 2026  
**Auditor**: Full-Stack QA & Application Security  
**Environment**: Live Pilot Runtime (`NEXT_PUBLIC_USE_MOCK_API=false`, PostgreSQL/Supabase Backend)  

---

## 1. Executive Summary

This document verifies the visual and operational behavior of all application routes following the zero-demo-data database cleanup. 

Every station, back-office screen, and operational view has been inspected to confirm:
1. **Zero Fabrication**: All numbers, financial tallies, orders, and statuses originate strictly from database records. No fabricated data, sample charts, or fallback mock records are rendered.
2. **Actionable Empty States**: Routes render truthful, high-clarity empty states with authorized action prompts (e.g. "Add First Table", "Add First Room", "Add First Menu Item", "Add Staff Member").
3. **No Silent Mock Fallback**: Failed network requests surface explicit error alerts and retry buttons; they never quietly fall back to fake records.
4. **Dynamic Persistence**: New business records created via the UI persist reliably to PostgreSQL and remain visible across browser reloads.

---

## 2. Route-by-Route Empty State Verification Matrix

| Route / Module | Role Access | Expected Zero State UI | Actionable Setup Action | API Failure Behavior | Verification Status |
|----------------|-------------|-------------------------|--------------------------|----------------------|---------------------|
| **`/admin`** (Back-Office Dashboard) | `ADMIN`, `SUPER_ADMIN` | Shows 0 tables, 0 rooms, 0 dishes, 0 orders, ₹0 today's sales. Setup Readiness checklist at 0% with clear action steps. | Step-by-step onboarding cards to add tables, rooms, menu, and staff. | Surfaces error banner; does not fabricate sales. | **VERIFIED (Clean Zero State)** |
| **`/admin/tables`** (Floor Tables) | `ADMIN` | "No Restaurant Tables Configured Yet. Your dining floor plan is empty." | "Add First Table" modal button with capacity and section fields. | Surfaces red error alert with retry button. | **VERIFIED (Clean Zero State)** |
| **`/admin/rooms`** (Guestrooms) | `ADMIN` | "No Hotel Rooms Configured Yet. Your accommodation inventory is empty." | "Add First Room" modal button with floor, suite type, and capacity. | Displays network failure state; does not inject demo rooms. | **VERIFIED (Clean Zero State)** |
| **`/admin/menu`** (Menu Catalog) | `ADMIN` | "Your menu is empty. Add your first menu item. Create categories and dishes to make them available for dining room and QR orders." | Category and dish creation actions. | Displays error state without fake dishes. | **VERIFIED (Clean Zero State)** |
| **`/admin/users`** (Staff Roster) | `ADMIN`, `SUPER_ADMIN` | Displays only the active `admin@ebilling.com` account. Zero seeded employees (0 waiters, 0 cooks, 0 cashiers, 0 managers). | "Add Staff Member" modal with granular RBAC permissions. | Error banner if unauthorized or network drops. | **VERIFIED (Clean Zero State)** |
| **`/kitchen`** (KDS Display) | `KITCHEN_STAFF`, `MANAGER`, `ADMIN` | "Kitchen is clear. No orders are waiting right now. Incoming table and room orders will chime here automatically." | Active WebSocket listener waiting for live orders. | Explicit KDS connection error banner with manual retry. | **VERIFIED (Clean Zero State)** |
| **`/cashier`** (Billing Desk) | `CASHIER`, `ADMIN` | "No customer invoices available. Invoices generated for dining tables and guestrooms will appear in this ledger." ₹0 revenue, 0 unsettled checks. | Live refresh button; opens payment modal when order is fired. | Displays network error without fabricated bills. | **VERIFIED (Clean Zero State)** |
| **`/manager`** (Floor Governance) | `MANAGER`, `ADMIN` | "Operations Clear • No Active Exceptions. All hardware devices, active kitchen lines, and guest checks are operating smoothly without bottlenecks." 0 orders, 0 cooking, 0 ready, 0 due. | Links to manage tables, inspect KDS, and cashier desk. | Error alert rendered on API fault. | **VERIFIED (Clean Zero State)** |
| **`/admin/reports`** (Analytics) | `ADMIN`, `SUPER_ADMIN` | Total Revenue: ₹0.00 ("No orders settled yet"). Total Orders: 0 ("Awaiting first order"). Avg Order: ₹0.00. Tax: ₹0.00. | Calculated dynamically from live settled bills. | Displays truthful zero analytics without sample curves. | **VERIFIED (Clean Zero State)** |
| **`/admin/audit`** (Audit Trail) | `SUPER_ADMIN`, `ADMIN` | Shows authoritative audit entry for `TENANT_RESET_TO_EMPTY_EXECUTED`. Zero dummy logs. | "Refresh Trail" button querying live database audit ledger. | Error banner if endpoint fails. | **VERIFIED (Clean Zero State)** |
| **`/login`** (Staff Login) | Public / Staff | Clean, minimal sign-in form with email and password inputs. Zero demo credential suggestions, chips, or autofill buttons. | "Sign In" button calling live `POST /api/v1/auth/login`. | Surfaces "Invalid credentials" or network failure alert. | **VERIFIED (Clean Zero State)** |
| **`/`** (Home / Landing Page) | Public | Minimalist overview of SCULPX platform capabilities without hardcoded demo table (T05) or room (301) numbers. | Links to QR Studio (`/admin/qr`), Rooms (`/admin/rooms`), and Staff Login (`/login`). | Static page with dynamic navigation links. | **VERIFIED (Clean Zero State)** |

---

## 3. Real-Time WebSocket & Deduplication Check

1. **No Simulated Events**:
   When `NEXT_PUBLIC_USE_MOCK_API=false`, `src/services/websocket/socket.service.ts` connects strictly to `NEXT_PUBLIC_WS_URL` (`ws://localhost:8000/ws`). If disconnected, it initiates backoff reconnection without dispatching fake simulated order or KOT events.
2. **In-Band Staff Authentication**:
   Authentication over WebSockets uses an in-band frame (`{ action: "AUTHENTICATE", token }`), ensuring JWT credentials never leak into URL query parameters or proxy access logs.
3. **Event Reconciliation**:
   On reconnection, the client automatically reconciles state by triggering React Query invalidation rather than blindly replaying stale events.

---

## 4. Hotel Administrator Onboarding Verification

The operational workflow for a new hotel property administrator was validated using `backend/scripts/test-clean-operations.ts`:

1. **Administrator Logs In**:
   - `admin@ebilling.com` logs in with their secure credential.
2. **Creates Dining Floor**:
   - Administrator adds tables with section and capacity. PostgreSQL assigns a unique UUID and table number.
3. **Creates Guestrooms**:
   - Administrator adds rooms with floor and suite type. PostgreSQL assigns unique UUID and room number.
4. **Creates Menu**:
   - Administrator creates menu categories and dishes with tax rate and dietary flags.
5. **Onboards Staff**:
   - Administrator creates employee accounts (e.g., Waiters, Cashiers, Cooks) and assigns specific granular permissions.
   - The created staff member can immediately log in at `/login` and access their designated workstation (`/staff`, `/cashier`, `/kitchen`).
6. **Data Persistence**:
   - All created entities persist to PostgreSQL and remain completely intact after page refresh or session restart.
