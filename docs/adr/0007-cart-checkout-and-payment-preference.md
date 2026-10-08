# ADR 0007: Cart Review, Checkout Form, and Context-Aware Payment Preferences

## Status
Accepted

## Context
In Phase 3, we implement the cart review and checkout pipeline (`/cart` and `/checkout`).
The ordering system serves both restaurant table diners and in-room hotel guests. The checkout experience needs:
1. Strict client-side and authoritative pre-order validation before dispatching to the kitchen.
2. Context-aware payment preferences where room guests can charge meals directly to their hotel room folio (`POST_TO_ROOM`), whereas table diners can choose to pay later at table (`PAY_LATER`) or pay online immediately (`PAY_NOW`).
3. Complete breakdowns with itemized pricing, selected modifiers, GST (5%), and grand total calculations.

## Decision
1. **Dynamic Payment Preference Selector**:
   - The selector inspects `qrContext.type`.
   - When `context.type === "ROOM"`, the deferral option is labeled **"Post to Room Folio"** with a hotel building badge and room-number confirmation.
   - When `context.type === "TABLE"`, the deferral option is labeled **"Pay Later at Table"** (cash or card settlement at checkout).
   - "Pay Now Online" remains available for all diners via UPI, cards, and netbanking.
2. **Order Summary Line Item Breakdown**:
   - `OrderSummaryCard` displays item quantities, names, grouped modifier names, item totals, 5% estimated GST, and total payable amount.
3. **Cart Review Screen (`/cart`)**:
   - Full-page responsive review screen with quantity increment/decrement, modifier labels, empty state CTA returning to menu, and proceed button.
4. **Pre-checkout Authoritative Backend Validation**:
   - `CheckoutForm` triggers `orderApi.validateOrder(payload)` before `createOrder` to ensure items remain in stock and valid.
   - On successful placement, the cart is purged and the user is redirected to `/order/[orderId]` for real-time live status tracking.

## Consequences
- Unified checkout codebase serving both table and room diners without branching application shells.
- Validated with 37 unit and component tests passing.
- Next.js production build passes cleanly.
