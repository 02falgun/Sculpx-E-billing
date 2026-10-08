# ADR 0005: Foundation Layer, Service Factory, and Realistic Mock Architecture

## Status
Accepted

## Context
During Phase 1 (Foundation), we need to establish the complete design system, application layouts, state stores, API clients, WebSocket connection manager, and realistic mock services. The frontend must be 100% testable and runnable offline or without an active backend, while preserving an identical contract for future REST/WebSocket cutover.

## Decision
1. **Design System**: Atomic UI components (`Button`, `Input`, `Select`, `Card`, `Badge`, `Dialog`, `Drawer`, `Tabs`, `Table`, `Spinner`, `EmptyState`, `ConfirmDialog`, `Pagination`, `SearchInput`) implemented with Tailwind CSS and fully accessible (ARIA, keyboard escape, focus trap).
2. **Domain-Shared Primitives**: `StatusBadge` dynamically formats and colors statuses for Orders, KOTs, Bills, and Payments; `DietIndicator` supports Veg, Non-Veg, Vegan, and Egg dietary icons; `QRContextBadge` unifies Room and Table status display.
3. **Service Factory Pattern**: `src/services/api/factory.ts` instantiates and exports typed singletons (`menuApi`, `orderApi`, `kitchenApi`, `billingApi`, `paymentApi`, `inventoryApi`, `printerApi`, `roomApi`, `tableApi`, `userApi`, `authApi`). Components and hooks consume these singletons through interfaces, never knowing whether mock or live implementations are active.
4. **Realistic Stateful Mock Database**: `src/mocks/mockDb.ts` maintains in-memory state with simulated network latency (100–250ms) to exercise realistic loading states and async cache workflows.
5. **Safe Storage for SSR & Vitest**: Zustand persistence includes a resilient fallback for non-browser / test environments where `window.localStorage` is unavailable.

## Consequences
- Foundation verified with 22 unit and component tests passing.
- Zero mock leakage into presentation components.
- Zero build or type errors.
