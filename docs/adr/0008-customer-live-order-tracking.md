# ADR 0008: Customer Real-Time Live Order Tracking and Status Management

## Status
Accepted

## Context
In Phase 4, we implement the customer order tracking interface at `/order/[orderId]`.
After placing an order, diners (both at restaurant tables and in hotel guest rooms) need transparent, real-time visibility into their order's journey from kitchen acceptance to preparation, plating, and delivery. Furthermore, diners must have the ability to review itemized selections, add further dishes, summon floor service, or cancel their order in accordance with strict restaurant cancellation business rules.

## Decision
1. **Dynamic Route `/order/[orderId]`**:
   - Resolves the order by ID using `useOrder(orderId)`.
   - Attaches `useOrderUpdates(orderId)` to subscribe to real-time WebSocket events (`ORDER_CONFIRMED`, `ORDER_PREPARING`, `ORDER_READY`, `ORDER_SERVED`, `ORDER_CANCELLED`).
   - Automatically falls back to background polling (15s interval) in the event of temporary network disconnection.
2. **5-Stage Visual Lifecycle Timeline (`OrderStatusTimeline`)**:
   - Progress flows strictly across 5 sequential stages: `PLACED` ➔ `CONFIRMED` ➔ `PREPARING` ➔ `READY` ➔ `SERVED` (or `CANCELLED`).
   - The current active stage features an animated pulsing status node with dynamic estimated wait time indications.
   - Cancelled orders display a prominent cancellation banner, recording reasons and refund notices.
3. **Cancellation Rule Guard (`OrderCancelModal`)**:
   - In accordance with restaurant kitchen operations, customer self-cancellation is strictly restricted to early stages (`PLACED` or `CONFIRMED`).
   - Once dishes enter `PREPARING` or beyond, cancellation requests are rejected, guiding guests to contact floor staff.
4. **Itemized Order & E-Bill Integration**:
   - Complete breakdown displaying item quantities, custom modifiers, special chef notes, subtotal, 5% GST, discounts, and total.
   - Quick CTA transitions diners directly to their digital e-bill (`/bill/[billId]`) once generated or served.

## Consequences
- Diners experience rich real-time feedback with zero manual page refreshes.
- Operational guardrails protect kitchen waste by disallowing mid-cooking cancellations.
- Verified with 50 tests passing across all 16 test suites.
- Next.js production build passes cleanly.
