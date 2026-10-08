# ADR 0001: Frontend Architecture and Technology Stack Selection

## Status
Accepted

## Context
We are designing a high-throughput, mission-critical hotel restaurant QR ordering and e-billing system that supports customer mobile ordering (room service and table dining), staff POS, kitchen display stations (KDS), and administrative operations. The system must operate with zero UI rewrites when moving from in-memory mock data to a real production backend.

## Decision
We select:
- **Next.js App Router**: Provides optimized server rendering, streaming, and granular route chunking.
- **TypeScript (Strict Mode)**: Guarantees compile-time correctness across complex order, billing, and modifier calculations.
- **Tailwind CSS**: Rapid, responsive, mobile-first styling with minimal CSS bundle footprint.
- **TanStack Query (React Query v5)**: Server state management, caching, deduplication, and background refetching.
- **Zustand**: Lightweight client-side state for ephemeral sessions (Cart, POS draft).
- **React Hook Form + Zod**: Type-safe runtime input validation with minimal re-renders.
- **Centralized WebSockets**: Single connection manager with event dispatching.
- **Vitest & Playwright**: Fast unit/component testing with comprehensive end-to-end browser coverage.

## Consequences
- Requires strict adherence to layered boundaries: UI components must never invoke `fetch()` or raw WebSockets directly.
- Developers must use custom hooks and service interfaces.
