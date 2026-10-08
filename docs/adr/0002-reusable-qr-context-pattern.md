# ADR 0002: Reusable Polymorphic QR Context Pattern

## Status
Accepted

## Context
Hotel operations involve two primary dining locations for guests:
1. In-room dining (Room QR, e.g. "Room 301")
2. Dining room seating (Table QR, e.g. "Table 5")
Building separate applications or distinct route hierarchies (e.g. `/room-service` and `/table-service`) would result in significant code duplication, divergent UI styling, and maintenance overhead.

## Decision
We implement a single, unified `QRContext` abstraction across the customer journey (`/menu/[qrToken]`, `/cart`, `/checkout`, `/order/[orderId]`, `/bill/[billId]`):
```typescript
export interface QRContext {
  token: string;
  type: "ROOM" | "TABLE";
  identifier: string;
  displayName: string;
  hotelId: string;
  hotelName: string;
  isActive: boolean;
}
```
All customer feature components consume `QRContext` transparently. Minor contextual differences (such as enabling "Post to Room Folio" for room guests) are handled dynamically based on `context.type`.

## Consequences
- Single codebase for both guest experiences.
- 100% component and test reusability across room and table orders.
