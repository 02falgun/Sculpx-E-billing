# Testing Strategy & Quality Assurance

## 1. Testing Pyramid

```text
       ▲
      / \     Playwright E2E (End-to-End User Journeys)
     /---\
    /     \    React Testing Library (Component & Integration Tests)
   /-------\
  /         \  Vitest (Unit Tests: Schemas, Utils, State Stores, Mocks)
 /-----------\
```

---

## 2. Test Suites Overview

### Unit Tests (`tests/unit/`)
- Pure utility functions: currency formatting, tax computations, date formatting.
- Zod schemas: valid & invalid payloads for QR, checkout, order placement, payments.
- Zustand stores: cart item additions, quantity decrements, modifier recalculations.

### Component & Integration Tests (`tests/component/`)
- Rendering with React Testing Library and mock providers (`QueryClientProvider`).
- Scenarios:
  - `MenuItemCard`: displays badges, triggers modifier modal on click.
  - `CartDrawer`: reflects dynamic modifier additions and subtotal calculation.
  - `KOTCard`: renders timer, color-codes urgency, triggers status transitions.
  - `OrderStatusTimeline`: renders active step highlighted and cancellation state.

### E2E Tests with Playwright (`tests/e2e/`)
Critical browser journeys validated across Desktop and Mobile viewports:
1. `customer-ordering.spec.ts`:
   - Scans QR token ➔ loads menu ➔ selects item + modifier ➔ adds to cart ➔ submits checkout (Pay Later) ➔ verifies order tracking screen.
2. `order-tracking-live.spec.ts`:
   - Places order ➔ simulates WebSocket status transitions (`PREPARING` ➔ `READY` ➔ `SERVED`) ➔ verifies UI updates live.
3. `cancellation.spec.ts`:
   - Places order ➔ requests cancellation within grace period ➔ verifies cancelled status and reason banner.
4. `staff-pos.spec.ts`:
   - Staff logs in ➔ views table map ➔ selects table ➔ creates order ➔ checks active orders tab.
5. `kitchen-kds.spec.ts`:
   - Kitchen receives new ticket ➔ chef accepts ➔ transitions to preparing ➔ marks ready.
6. `billing-settlement.spec.ts`:
   - Cashier accesses bill ➔ applies discount ➔ records payment ➔ verifies receipt view.
