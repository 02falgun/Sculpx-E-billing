# SCULPX E-BILLING — PILOT DATABASE CLEANUP REPORT
**Date**: October 12, 2026  
**Executed Script**: `backend/scripts/cleanup-tenant.ts --tenant-id=e1b1d1f0-0000-4000-8000-000000000001 --reset-to-empty --execute --confirm=e1b1d1f0-0000-4000-8000-000000000001`  
**Database Host**: `aws-0-ap-northeast-2.pooler.supabase.com:5432/postgres` (Supabase Project `sylwmgqsbnvsylriufpy`)  
**Target Pilot Tenant**: `e1b1d1f0-0000-4000-8000-000000000001` (`Sculpx Pilot Hotel & Restaurant`)  

---

## 1. Executive Summary

A transactional purge of all legacy test, demonstration, and seeded business data was performed on the active PostgreSQL database. 

The purge complied strictly with the following non-negotiable requirements:
1. All fake orders, kitchen tickets, test invoices, test payments, and dependent child records were removed.
2. All seeded demo staff accounts (`*@demo.com`) and pre-seeded employee accounts (`*@ebilling.com` non-admins) were removed.
3. All default rooms, tables, QR tokens, menu categories, menu items, modifier groups/options, printers, and inventory items were removed.
4. The authoritative platform Super Administrator (`superadmin@ebilling.com`) and designated hotel administrator (`admin@ebilling.com`) were preserved.
5. All built-in role definitions and permission catalogs remain active in the application architecture.
6. The database and client applications were left in a clean, production-ready zero-business-data initial state.

---

## 2. Quantitative Before-and-After Record Inventory

| Entity / Database Table | Before Cleanup Count | After Cleanup Count | Records Removed | Notes & Status |
|-------------------------|----------------------|---------------------|-----------------|----------------|
| **Tables (`tables`)** | 38 | **0** | 38 | All demo floor tables removed |
| **Rooms (`rooms`)** | 7 | **0** | 7 | All demo guestrooms removed |
| **QR Codes (`qr_codes`)** | 46 | **0** | 46 | All demo tokens and orphaned QR records purged |
| **Menu Categories (`menu_categories`)** | 185 | **0** | 185 | Automated test fixtures & demo categories purged |
| **Menu Items (`menu_items`)** | 108 | **0** | 108 | All demo dishes purged |
| **Modifier Groups (`modifier_groups`)** | 5 | **0** | 5 | Cascaded and purged |
| **Modifier Options (`modifier_options`)** | 11 | **0** | 11 | Cascaded and purged |
| **Orders (`orders`)** | 135 | **0** | 135 | All fake test and demo orders purged |
| **Order Items (`order_items`)** | 139 | **0** | 139 | All dependent order item records purged |
| **Kitchen Tickets (`kots`)** | 111 | **0** | 111 | All kitchen tickets purged |
| **KOT Items (`kot_items`)** | 114 | **0** | 114 | All kitchen item lines purged |
| **Bills / Invoices (`bills`)** | 32 | **0** | 32 | All test dining invoices purged |
| **Bill Items (`bill_items`)** | 36 | **0** | 36 | All bill item lines purged |
| **Payments (`payments`)** | 18 | **0** | 18 | All test payment ledger entries purged |
| **Printers (`printers`)** | 195 | **0** | 195 | All physical/demo printers purged |
| **Print Jobs (`print_jobs`)** | 345 | **0** | 345 | All print queue jobs purged |
| **Print Agents (`print_agents`)** | 0 | **0** | 0 | 0 active agents |
| **Inventory Items (`inventory_items`)** | 13 | **0** | 13 | All demo raw material records purged |
| **Inventory Tx (`inventory_transactions`)** | 3 | **0** | 3 | All stock deduction entries purged |
| **Recipes (`recipes`)** | 0 | **0** | 0 | Clean state |
| **Staff Invitations (`staff_invitations`)** | 0 | **0** | 0 | Clean state |
| **Custom Roles (`custom_roles`)** | 0 | **0** | 0 | Clean state |
| **Users (`users`)** | 18 | **2** | 16 | **See breakdown below** |
| **Audit Logs (`audit_logs`)** | 0 | **1** | - | Authoritative audit record `TENANT_RESET_TO_EMPTY_EXECUTED` created |

---

## 3. Staff Accounts Audit & Breakdown

### A. Accounts Removed (16 Total)

1. **Legacy Demo Accounts (7 Users)**:
   - `superadmin@demo.com` (SUPER_ADMIN)
   - `admin@demo.com` (ADMIN)
   - `manager@demo.com` (MANAGER)
   - `kitchen@demo.com` (KITCHEN_STAFF)
   - `cashier@demo.com` (CASHIER)
   - `waiter@demo.com` (WAITER)
   - `captain@demo.com` (CAPTAIN)

2. **Seeded Pilot Employee Accounts (5 Users)**:
   - `manager@ebilling.com` (MANAGER)
   - `captain@ebilling.com` (CAPTAIN)
   - `waiter@ebilling.com` (WAITER)
   - `cashier@ebilling.com` (CASHIER)
   - `kitchenstaff@ebilling.com` (KITCHEN_STAFF)
   *(Under the Zero Demo Data rule, hotel staff must not be pre-seeded; they are created on demand by the Hotel Administrator via `/admin/users`)*

3. **Orphaned Foreign Test Users (4 Users)**:
   - `chef-b-1791719172559@foreign.com`
   - `cashier-b-1791721904559@foreign.com`
   - `admin-b-p5-1791723477913@foreign.com`
   - `admin-b-p6-1791725739489@foreign.com`

### B. Retained Accounts (2 Authoritative Users)

1. **Platform Super Administrator**:
   - Email: `superadmin@ebilling.com`
   - Role: `SUPER_ADMIN`
   - Scope: Platform-wide governance, audit trail, multi-property management
   - Bootstrap Path: `backend/scripts/bootstrap-platform.ts`

2. **Hotel / Property Administrator**:
   - Email: `admin@ebilling.com`
   - Role: `ADMIN`
   - Scope: Tenant `e1b1d1f0-0000-4000-8000-000000000001` back-office management, staff onboarding, menu cataloging, floor layouts, printer registration

---

## 4. Foreign-Key Constraint & Transactional Integrity

The cleanup was executed inside an atomic PostgreSQL transaction with the following execution sequence:

1. **Hardware & Queue**: `print_jobs` → `printers` → `print_agents`
2. **Financial Records**: `payments` → `bill_items` → `bills`
3. **Operational Records**: `inventory_transactions` → `kot_items` → `kots` → `order_items` → `tables.currentOrderId` cleared → `idempotency_keys` → `daily_counters` → `outbox_events` → `orders`
4. **Inventory & Recipes**: `recipes` → `recipe_ingredients` → `inventory_items`
5. **Menu Hierarchy**: `modifier_options` → `modifier_groups` → `menu_items` → `menu_categories`
6. **Floors & Rooms**: `qr_codes` → `tables` → `rooms`
7. **Authorization**: `custom_roles` → `staff_invitations` → `users` (`onDelete: Cascade` for `user_permissions`)
8. **Tenant Neutralization**: Updated tenant metadata to clean hotel state with 0% service charge default and null GSTIN.
9. **Audit Log Persistence**: Recorded `TENANT_RESET_TO_EMPTY_EXECUTED` in `audit_logs`.

---

## 5. Security & Isolation Verification

- **Platform Super Admin Protection**: Verified that non-super admins cannot onboard tenants or modify platform credentials.
- **Tenant Isolation**: Confirmed that queries on the cleaned tenant cannot read or write data across other tenant UUIDs.
- **No Shared Passwords**: Demo passwords removed. All new employees are onboarded with individual passwords or secure credentials.
- **Audit Ledger**: The cleanup event was recorded with detailed metrics in the database audit log.
