# ADR 0006: Customer Menu Architecture and Modifier Customization Engine

## Status
Accepted

## Context
In Phase 2, we implement the core customer ordering catalog at `/menu/[qrToken]`. The catalog must support both table and in-room diners with zero code duplication, fast debounced search, dietary filtering, and complex dish customization (single choice options like crust/portion size, and multi-choice options like toppings/dips) while enforcing required selection boundaries.

## Decision
1. **Dynamic Route `/menu/[qrToken]`**:
   - Resolves polymorphic `QRContext` via `useQRContext(qrToken)`.
   - Automatically synchronizes verified context into `useCartStore`.
   - Protects against cross-table leakage: if a diner scans a new QR token, cart items from the previous session are reset.
2. **Modifier Modal Customization Engine**:
   - Manages single-choice (`maxSelections: 1`) radio-style behavior and multi-choice checkbox behavior.
   - Computes live incremental price updates in real-time as users click options.
   - Validates that all required groups meet `minSelections` before the "Add to Order" action button is enabled.
   - Embeds a special cooking instructions input capped at 150 characters to prevent database bloat.
3. **Dietary Filtering & Debounced Search**:
   - Combines server-side category/search queries with fast client-side dietary toggles (`Veg Only`, `Non-Veg`, `Chef's Specials`).
   - Uses `useDebounce` (300ms) to throttle search input.

## Consequences
- Seamless customer experience across mobile viewports.
- All 29 unit and component tests pass.
- Verified production build.
