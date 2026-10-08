# Project Overview: Hotel Restaurant QR E-Billing Platform

## 1. Executive Summary
The **Hotel Restaurant QR E-Billing Platform** is an omni-channel restaurant and room-service ordering system tailored for hotels, resorts, and modern dining establishments. It provides a touchless, high-speed ordering and e-billing experience for hotel guests and diners while powering staff operations via a real-time Point of Sale (POS), Kitchen Display System (KDS), and administrative back-office.

---

## 2. Core Personas
1. **Diners & Hotel Guests (Customer Flow)**:
   - Scans dynamic QR code located on a restaurant dining table (e.g., `TABLE 5`) or hotel guestroom (e.g., `ROOM 301`).
   - Browses menu with dietary filters, item modifiers, and allergen warnings.
   - Places orders with choice of payment: **Pay Now** (UPI/Card/Gateway) or **Pay Later** (Room Charge or Cash at Counter).
   - Tracks live preparation and delivery status in real-time.
   - Accesses digitized itemized E-Bill.
2. **Floor Staff / Waiters / Captains (Staff POS Flow)**:
   - Views floor map with live table status (Available, Occupied, Billed, Reserved).
   - Enters walk-in orders, takes table orders, or adds items to existing running orders.
   - Manages table transfers and order modifications.
3. **Cashier / Accounts**:
   - Manages running tabs, calculates discounts, splits bills, and processes payments (Cash, Card, UPI, Room Charge).
   - Dispatches thermal receipts to counter printers.
4. **Kitchen Chefs & Expeditors (Kitchen KDS Flow)**:
   - Large-format touch interface showing incoming Kitchen Order Tickets (KOT).
   - Manages live states: `NEW` ➔ `ACCEPTED` ➔ `PREPARING` ➔ `READY` ➔ `SERVED`.
5. **Hotel Restaurant Manager / Admin**:
   - Manages menu items, categories, modifier groups, and live availability.
   - Manages rooms, tables, and generates dynamic QR codes.
   - Monitors inventory stock depletion, recipes, and transactions.
   - Monitors thermal printers and print job retry queues.

---

## 3. The Unified QR Model: Room QR vs Table QR
A foundational design principle of this application is:
> **Do NOT build separate applications for room service and restaurant table ordering.**

Both scenarios share the exact same menu browsing, cart management, checkout, and tracking mechanics. They are unified through a single polymorphic **QRContext**:
```typescript
export interface QRContext {
  token: string;
  type: "ROOM" | "TABLE";
  identifier: string;      // "301" or "5"
  displayName: string;     // "Room 301" or "Table 5"
  hotelId: string;
  hotelName: string;
  isActive: boolean;
}
```
The application dynamically adapts payment options (e.g., enabling "Room Charge / Post to Room Folio" for `ROOM` context) while keeping all core customer screens 100% reusable.

---

## 4. Frontend vs Backend Authority Boundary

| Concern | Frontend Responsibility | Backend Responsibility (Authoritative) |
| :--- | :--- | :--- |
| **Menu & Items** | Display items, handle search/filter, modifier selection | Item availability, pricing catalogue, active menus |
| **Cart** | Client-side drafting, quantity controls, temporary session | None (cart is client state until submission) |
| **Pricing & Taxes** | Display estimated calculation for instant feedback | **Authoritative pricing, tax rates (CGST/SGST), discounts** |
| **Orders** | Form validation, submission, optimistic UX | **Order creation, validation, inventory allocation, ID generation** |
| **Live Status** | Subscribes to WebSockets, renders live timeline | Order status state machine, kitchen assignments |
| **Billing** | Displays bill breakdown, payment method selection | **Final bill generation, rounding, invoice numbering, tax compliance** |
| **Payments** | Captures input, triggers gateway / payment payload | **Payment verification, settlement, transaction ledger** |
| **Printers** | Displays printer status, triggers reprint/retry requests | **Direct printer communication, ESC/POS formatting, queue management** |

---

## 5. Technology Stack
- **Framework**: Next.js (App Router, Server & Client Components)
- **Language**: TypeScript (Strict mode, zero `any`)
- **Styling**: Tailwind CSS (Mobile-first, responsive, accessible design tokens)
- **Server State & Caching**: TanStack Query (React Query v5)
- **Client State**: Zustand (Cart, POS draft, ephemeral session state)
- **Forms & Validation**: React Hook Form + Zod
- **Real-Time Engine**: WebSocket Connection Manager + Event Dispatcher
- **Testing**: Vitest, React Testing Library, Playwright E2E
- **Tooling**: ESLint, Prettier
