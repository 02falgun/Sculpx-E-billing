# SCULPX E-Billing: Demo Mode & Role Switcher

## 1. Purpose
Demo Mode allows developers, stakeholders, and prospective hotel clients to immediately test and experience all seven hospitality perspectives without requiring backend authentication setup.

---

## 2. Shared Internal Login (`/login`)

The `/login` station provides one-click quick-fill profiles for all roles:

| Role | Demo Email | Mock Password | Target Workspace |
| :--- | :--- | :--- | :--- |
| **Waiter** | `waiter@demo.com` | `demo-secure-pass` | `/staff` |
| **Cashier** | `cashier@demo.com` | `demo-secure-pass` | `/cashier` |
| **Kitchen** | `kitchen@demo.com` | `demo-secure-pass` | `/kitchen` |
| **Manager** | `manager@demo.com` | `demo-secure-pass` | `/manager` |
| **Admin** | `admin@demo.com` | `demo-secure-pass` | `/admin` |
| **Super Admin** | `superadmin@demo.com` | `demo-secure-pass` | `/admin` |

---

## 3. Persistent Floating Role Switcher (`DemoRoleSwitcher`)
- Mounted globally in `src/app/providers.tsx`.
- Displays currently active role: `Guest Customer`, `Waiter / Staff`, `Cashier`, `Kitchen Staff`, `Floor Manager`, `Administrator`, or `Super Admin`.
- Allows instant 1-click hot-switching between all workspaces.
- Includes quick links to `/login` and sign-out.
- Hidden automatically in print preview (`print:hidden`).

---

## 4. End-to-End Operational Lifecycle Demo
The mock database (`mockDb.ts`) and API services are bidirectionally synchronized:

1. **FLOW A (Customer)**:
   - Navigate to `/menu/table/T05`.
   - Add items (e.g. Butter Chicken with Garlic Naan) to cart.
   - Checkout and confirm order.
   - Redirects to `/order/[orderId]` live status timeline.

2. **FLOW B (Waiter)**:
   - Switch to **Waiter** (`/staff`).
   - Notice Table 05 is now **Occupied** with the active order in `/staff/tables`.
   - Can inspect ticket or add table-side items via POS (`/staff/pos`).

3. **FLOW C (Kitchen)**:
   - Switch to **Kitchen** (`/kitchen`).
   - Notice ticket **#KOT** for Table 05 appears under **NEW KOTs**.
   - Advance ticket: **Accept** -> **Start Cooking** -> **Mark Ready**.

4. **FLOW D (Waiter)**:
   - Switch back to **Waiter** (`/staff`).
   - Notice Table 05 appears under **Needs Your Attention Now: Kitchen Ready**.
   - Tap **Mark Served**.

5. **FLOW E (Cashier)**:
   - Switch to **Cashier** (`/cashier`).
   - Open Bill for Table 05 in `/cashier/bills`.
   - Click **Collect Payment** -> select payment method (UPI / Card) -> Confirm payment.
   - Status updates to **PAID**, outstanding balance cleared to ₹0.
   - Print thermal tax invoice.
