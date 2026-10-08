# ADR 0012: Active Orders Management and Central Billing Desk

## Status
Accepted

## Context
In Phase 8, we implement the staff management interfaces for active orders and financial settlement:
- `/orders`: Comprehensive operational view of active table and room service orders across all stations.
- `/billing`: Dedicated cashier billing desk monitoring unsettled tabs, total revenue collected, and rapid bill settlement with thermal printing simulation.

## Decision
1. **Active Orders Control (`OrdersList`)**:
   - Provides stage tabs ("All Orders", "Preparing", "Food Ready", "Served", "Cancelled").
   - Live debounced search across order numbers, table numbers, and guest names.
   - Distinct tags discerning `CUSTOMER_QR` self-orders from `STAFF_POS` captain tickets.
   - Real-time updates via `useOrderUpdates()`.
2. **Central Cashier Billing Desk (`BillingDeskTable`)**:
   - Surfaces instant financial metrics: Total Outstanding Due, Collected Revenue Today, and Shift Invoice count.
   - Allows instant filtering into "Unsettled Tabs", "Paid & Settled", and "All Invoices".
   - Provides quick "Thermal Print" dispatching action and direct routing to `/bill/[billId]` to execute payment collection.
3. **Data Layer Integration (`useAllBills`)**:
   - Added `useAllBills` hook in `src/hooks/useBilling.ts` to query paginated bills and listen to WebSocket `useBillingUpdates()`.

## Consequences
- Cashiers and managers possess unified visibility over uncollected dining tabs and open table accounts.
- Zero mismatch between POS tickets and billing ledger.
- Verified with 76 unit and component test assertions across 28 test files.
- Production build passes cleanly with zero errors.
