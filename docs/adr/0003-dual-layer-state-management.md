# ADR 0003: Dual-Layer State Management Architecture

## Status
Accepted

## Context
Applications frequently suffer from state bloat when developers use a single global store (such as Redux or unorganized Zustand) to mirror server-side database records. This causes stale cache anomalies, manual synchronization headaches, and complex action boilerplate.

## Decision
We enforce a strict dual-layer state boundary:
1. **Server State (TanStack Query)**:
   - Owns all data retrieved from backend APIs (Menu, Active Orders, KOTs, Bills, Inventory, Printers).
   - Manages caching, stale windows, deduplication, and invalidation upon receiving WebSocket events.
2. **Client State (Zustand)**:
   - Owns transient client-only data:
     - `useCartStore`: Shopping cart item configuration and local customizations.
     - `usePOSStore`: Staff draft tickets prior to firing to kitchen.
     - `useUIStore`: Toast queues and active modal identifiers.

## Consequences
- Server data is never manually duplicated in client stores.
- Clear mental model for developers.
- Reduced boilerplate and automatic background synchronization.
