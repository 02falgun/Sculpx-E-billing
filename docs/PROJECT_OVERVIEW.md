# Project Overview: SCULPX E-Billing & Hospitality POS

> **Application Name**: SCULPX E-Billing & QR Ordering Platform  
> **Frontend Stack**: Next.js 16 (App Router), React 19, TypeScript, TanStack Query, Zustand, Tailwind CSS, Zod  
> **Planned Backend Stack**: Node.js REST API + PostgreSQL 15+ on VPS with WebSockets  
> **Status**: Frontend UI/UX Complete; Integration Handover Ready  

---

## 1. Executive Summary
SCULPX E-Billing is an omni-channel restaurant and room-service ordering system tailored for hotels, resorts, and modern fine dining establishments. It provides a touchless, high-speed ordering and e-billing experience for hotel guests and diners while powering staff operations via a real-time Point of Sale (POS), Kitchen Display System (KDS), Cashier Settlement Desk, and administrative back-office.

---

## 2. Core Operational Personas

1. **Diners & Hotel Guests (Customer Flow)**:
   - Scans dynamic QR code located on a restaurant dining table (e.g., `T01`) or hotel guestroom (e.g., `Room 301`).
   - Browses menu with dietary filters, item modifiers, and allergen warnings.
   - Places orders with choice of payment: **Pay Now** (UPI/Card/Gateway) or **Pay Later** (Room Charge or Cash at Counter).
   - Tracks live preparation and delivery status in real-time.
   - Accesses digitized itemized E-Bill.
2. **Floor Staff / Waiters / Captains (Staff POS Flow)**:
   - Views floor map with live table status (Vacant, Occupied, Billed, Reserved).
   - Enters walk-in orders, takes table orders, or adds items to existing running orders.
   - Dispatches tickets directly to kitchen stations.
3. **Cashier / Accounts**:
   - Manages running tabs, calculates discounts, splits bills, and processes payments (Cash, Card, UPI, Room Charge).
   - Dispatches thermal receipts to counter printers.
4. **Kitchen Chefs & Expeditors (Kitchen KDS Flow)**:
   - Large-format touch interface showing incoming Kitchen Order Tickets (KOT).
   - Manages live states: `NEW` -> `ACCEPTED` -> `PREPARING` -> `READY` -> `SERVED`.
5. **Hotel Restaurant Manager / Admin**:
   - Manages menu items, categories, modifier groups, and live availability.
   - Manages rooms, tables, and generates dynamic QR codes.
   - Monitors inventory stock depletion, recipes, and transactions.
   - Monitors thermal printers and print job retry queues.

---

## 3. The Unified QR Model: Room QR vs Table QR

A foundational architectural principle of this application:
> **Do NOT build separate applications for room service and restaurant table ordering.**

Both scenarios share the exact same menu browsing, cart management, checkout, and tracking mechanics. They are unified through a single polymorphic **QRContext**:

```typescript
export interface QRContext {
  id: string;
  type: "ROOM" | "TABLE";
  identifier: string;      // "301" or "T01"
  displayName: string;     // "Room 301" or "Table 01"
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
| **Kitchen KOT** | Render tickets, elapsed timers, status triggers | **Ticket ordering, kitchen routing, cancellation propagation** |
| **Billing** | Display invoice, present payment options | **Official tax invoice generation, sequence numbering, settlement** |
| **Inventory** | Display stock levels and threshold warnings | **Ingredient deductions, BOM consumption, race-condition locking** |
| **Printing** | Queue print job request, monitor status | **Reliable ESC/POS network transmission, retry backoff** |

---

## 5. Master Handover Documentation Sitemap

For complete technical specifications, consult the dedicated guides:
- [Backend Integration Matrix](./BACKEND_INTEGRATION_MATRIX.md)
- [REST API Contract Specification](./API_CONTRACT.md)
- [PostgreSQL Data Models & DDL](./DATA_MODELS.md)
- [Order & Kitchen Workflows](./ORDER_AND_KITCHEN_WORKFLOWS.md)
- [Billing & Payment Contract](./BILLING_AND_PAYMENT_CONTRACT.md)
- [Authentication & Authorization](./AUTHENTICATION_AND_AUTHORIZATION.md)
- [WebSocket Real-Time Contract](./WEBSOCKET_CONTRACT.md)
- [QR Code System Specification](./QR_SYSTEM.md)
- [Inventory & Recipe BOM Handover](./INVENTORY_HANDOVER.md)
- [Hardware Printer Integration](./PRINTER_INTEGRATION.md)
- [Environment Configuration](./ENVIRONMENT_SETUP.md)
- [Error Handling Standards](./ERROR_HANDLING.md)
- [Security & Multi-Tenancy Review](./SECURITY_REVIEW.md)
- [VPS Integration Requirements](./VPS_INTEGRATION.md)
- [Database Handover & Seed Data](./DATABASE_HANDOVER.md)
- [Backend Integration Test Plan](./BACKEND_INTEGRATION_TEST_PLAN.md)
- [Backend Handover Checklist](./BACKEND_HANDOVER_CHECKLIST.md)
