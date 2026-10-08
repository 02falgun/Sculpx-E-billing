# ADR 0010: Staff Point of Sale (POS) and Floor Table Management

## Status
Accepted

## Context
In Phase 6, we implement the staff-facing operations interfaces:
- `/dashboard`: High-level operational overview & shift KPI summary.
- `/tables`: Interactive floor table map with section filtering, capacity metrics, and live occupancy status.
- `/pos`: Rapid-entry point of sale terminal for floor waiters and captains with dual support for restaurant tables and room service tickets.

Waiters must be able to quickly select tables, browse categorized menus, search dishes, customize tickets with cooking notes, and dispatch Kitchen Order Tickets (KOTs) directly to the kitchen line without paper tickets.

## Decision
1. **Route Group Architecture `(staff)`**:
   - Routes `/dashboard`, `/tables`, and `/pos` are grouped under `src/app/(staff)/layout.tsx`.
   - Layout renders `StaffNavigation` and automatically mounts an authenticated captain session fallback (`Amit Kumar, Floor Captain`) so demo operational terminals are immediately usable.
2. **Floor Table Map & Section Partitioning (`TableGrid` & `TableCard`)**:
   - Tables reflect real-time status badges (`AVAILABLE`, `OCCUPIED`, `RESERVED`, `BILLED`).
   - Occupied cards surface active order numbers, linked bill indicators, and direct quick-order CTAs.
   - Floor captains can update table states inline via `useUpdateTableStatus()`.
3. **Point of Sale Terminal (`POSTerminal`)**:
   - Supports polymorphic dining context selection between restaurant tables and hotel guest rooms.
   - Fast item additions with live quantity stepper and subtotal + 5% GST computation.
   - Dispatches order creation with source tagged as `STAFF_POS`, setting table to `OCCUPIED` and routing directly to the order tracking view.
4. **Zustand POS Store Integration (`usePOSStore`)**:
   - Seamlessly carries table selections from the floor map into the POS draft order ticket.

## Consequences
- Fast and reliable floor workflows for waitstaff and cashiers.
- Full type safety across Table, Room, and Order domains.
- Verified with 64 unit and component test assertions across 22 test files.
- Production build passes cleanly with zero errors.
