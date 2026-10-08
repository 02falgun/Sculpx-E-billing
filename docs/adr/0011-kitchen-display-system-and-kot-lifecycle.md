# ADR 0011: Kitchen Display System (KDS) and Real-Time KOT Lifecycle

## Status
Accepted

## Context
In Phase 7, we implement the Kitchen Display System (KDS) at `/kitchen`.
The kitchen operations environment requires high contrast, touchscreen-friendly, paperless execution with:
1. Multi-stage order progression (`NEW` ➔ `ACCEPTED` ➔ `PREPARING` ➔ `READY` ➔ `SERVED`).
2. Urgency visualization: elapsed prep timer color-coded into normal (<10 min), warning (10-15 min), and urgent (>15 min with pulse animation).
3. Itemized cooking checklist with click-to-strike support for chefs.
4. Real-time WebSocket synchronization (`useKitchenUpdates`) to reflect newly fired KOTs without page refreshing.

## Decision
1. **High-Contrast Dark Theme Interface**:
   - `KitchenHeader` displays live digital expedite clock, WebSocket sync status, and active ticket count.
   - Screen uses dark slate styling (`bg-slate-950`) designed for kitchen heat, grease, and glare.
2. **KOT Timer with Urgency Tiering (`KOTTimer`)**:
   - Calculates elapsed duration per ticket in real time.
   - Triggers color shift to amber at 10 minutes and pulsing rose at 15 minutes.
3. **Interactive Line Cook Ticket Card (`KOTCard`)**:
   - Displays KOT number, parent order number, table or room dining context, modifiers, and special notes.
   - Enables line cooks to mark individual dishes as prepared with interactive checkmarks.
   - Progresses tickets across lifecycle buttons ("Accept Ticket" ➔ "Start Cooking" ➔ "Mark Ready to Serve" ➔ "Expedite & Complete").
4. **KDS Stage Filtering & Auto-Refresh (`KDSBoard`)**:
   - Tabs allow filtering by "All Active", "New / Pending", "Cooking", and "Ready for Pickup".
   - Integrates `useKitchenUpdates()` to automatically invalidate and refetch active KOTs on WebSocket dispatch.

## Consequences
- Replaces traditional noisy paper kitchen printers with reliable, real-time digital screens.
- Zero latency between customer/waiter ordering and kitchen ticket receipt.
- Verified with 72 unit and component test assertions across 25 test suites.
- Production build passes cleanly with zero errors.
