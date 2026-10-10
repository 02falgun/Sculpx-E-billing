# SCULPX E-Billing — End-to-End Backend Integration Test Plan

> **Audience**: QA Engineers, Full-Stack Developers, Integration Testers  
> **Topic**: Step-by-Step Test Scenarios for Live API & WebSocket Verification  

---

## 1. Test Matrix: Customer Guest Journey

| ID | Test Scenario | Steps | Expected Result | Pass / Fail |
|---|---|---|---|---|
| **CUST-01** | **Valid Table QR Resolution** | Scan or browse `/menu/table/T01` | Calls `GET /menu/context/T01`. Resolves Table 01 metadata. Renders Category Tabs and Menu Catalog. | [ ] |
| **CUST-02** | **Valid Room QR Resolution** | Browse `/menu/room/301` | Calls `GET /menu/context/301`. Resolves Room 301 in-room dining metadata. | [ ] |
| **CUST-03** | **Invalid / Non-Existent QR** | Browse `/menu/table/INVALID99` | Calls `GET /menu/context/INVALID99`. Returns `404 Not Found`. Renders friendly error banner. | [ ] |
| **CUST-04** | **Deactivated Station QR** | Browse a deactivated table QR token | Returns `410 Gone`. Renders station maintenance / closed message. | [ ] |
| **CUST-05** | **Browse Menu & Modifiers** | Select item with modifiers (Butter Chicken) | `ModifierModal` opens. Single-select and multi-select modifier options operate correctly. Price updates dynamically. | [ ] |
| **CUST-06** | **Cart & Checkout Pre-Validation**| Add 2 items, click Checkout | Calls `POST /orders/validate`. Confirms item availability and exact server pricing/taxes. | [ ] |
| **CUST-07** | **Out-of-Stock Item Rejection** | Attempt checkout on item with 0 stock | `POST /orders/validate` returns `409 Conflict`. Cart flags out-of-stock item in red. | [ ] |
| **CUST-08** | **Order Submission** | Fill name/phone, click "Place Order" | `POST /orders` called with `Idempotency-Key`. Returns `201 Created` with order ID. Redirects to `/order/[orderId]`. | [ ] |
| **CUST-09** | **Real-Time Live Tracking** | Keep `/order/[orderId]` open | WebSocket subscribes to `order:<id>`. When kitchen updates status, timeline immediately advances. | [ ] |
| **CUST-10** | **Customer Order Cancellation** | Click "Cancel Order" within 2 min | `POST /orders/:id/cancel` succeeds. Status updates to `CANCELLED`. Timeline turns red. | [ ] |
| **CUST-11** | **Customer Bill & UPI Settlement**| Navigate to `/bill/[billId]` | Displays itemized GST tax invoice. Open UPI modal, complete payment. Bill updates to `PAID`. | [ ] |

---

## 2. Test Matrix: Waiter Station Journey

| ID | Test Scenario | Steps | Expected Result | Pass / Fail |
|---|---|---|---|---|
| **WAIT-01** | **Staff Authentication** | Sign in as `waiter@demo.com` | Calls `POST /auth/login`. Returns JWT token. Redirects to `/staff`. | [ ] |
| **WAIT-02** | **Floor Table Grid** | View `/staff/tables` | Calls `GET /tables`. Renders live occupancy badges (VACANT, OCCUPIED, etc.). | [ ] |
| **WAIT-03** | **Rapid POS Table Order** | Open `/staff/pos`, select Table 02 | Add items, select modifiers, click "Send to Kitchen". `POST /orders` created with `source: 'STAFF_POS'`. | [ ] |
| **WAIT-04** | **Real-Time Notification** | Order state changes in kitchen | Waiter UI receives WebSocket event and updates badge without page reload. | [ ] |
| **WAIT-05** | **Staff Logout** | Click "Sign Out" | Calls `POST /auth/logout`. Clears session from storage. Redirects to `/login`. | [ ] |

---

## 3. Test Matrix: Kitchen KDS Journey

| ID | Test Scenario | Steps | Expected Result | Pass / Fail |
|---|---|---|---|---|
| **KIT-01** | **KDS Authentication** | Sign in as `kitchen@demo.com` | Redirects to `/kitchen`. KDS Board loads active tickets via `GET /kitchen/kots`. | [ ] |
| **KIT-02** | **Real-Time KOT Reception** | Customer places order on phone | KDS receives `KOT_CREATED` via WebSocket. New ticket card appears instantly with sound chime. | [ ] |
| **KIT-03** | **KOT Progression** | Tap "Accept" -> "Start Cooking" -> "Ready" | `PATCH /kitchen/kots/:id/status` called for each step. Status badge and timer update. | [ ] |
| **KIT-04** | **Cancellation Alert** | Customer cancels order | KDS card displays flashing red "CANCELLED" banner and moves to archived queue. | [ ] |

---

## 4. Test Matrix: Cashier Settlement Journey

| ID | Test Scenario | Steps | Expected Result | Pass / Fail |
|---|---|---|---|---|
| **CASH-01** | **Cashier Ledger Load** | Sign in as `cashier@demo.com` | Redirects to `/cashier`. Loads all bills via `GET /bills`. | [ ] |
| **CASH-02** | **Record Cash Payment** | Select unpaid bill, tender cash | `POST /bills/:id/payments` with `method: 'CASH'`. Bill status becomes `PAID`. Balance becomes 0. | [ ] |
| **CASH-03** | **Thermal Receipt Print** | Click "Print Receipt" | Calls `POST /print-jobs`. Queues receipt job for reception thermal printer. | [ ] |
| **CASH-04** | **Refund Processing** | Click "Refund" on settled bill | `POST /payments/:id/refund` processed. Refund logged in journal. | [ ] |

---

## 5. Test Matrix: Admin & Edge Conditions

| ID | Test Scenario | Steps | Expected Result | Pass / Fail |
|---|---|---|---|---|
| **ADM-01** | **Role Restriction Defense** | As Waiter, navigate to `/admin` | `RoleGuard` blocks access. Shows "Restricted Station" modal. | [ ] |
| **ADM-02** | **Inventory Stock Adjustment** | Add 10 KG chicken on `/admin/inventory`| Calls `POST /inventory/adjustments`. Stock updates. Transaction row created. | [ ] |
| **ADM-03** | **Printer Retry Queue** | Retry failed job on `/admin/printers` | Calls `POST /print-jobs/:id/retry`. Status moves from `FAILED` to `RETRYING`. | [ ] |
| **EDGE-01**| **Network Disconnection** | Disable Wi-Fi during browsing | Persistent offline banner renders. Automatic exponential reconnection triggers. | [ ] |
| **EDGE-02**| **Double Click Submit** | Double-click "Submit Order" button | Button disables after first click. `Idempotency-Key` protects against duplicate creation. | [ ] |
