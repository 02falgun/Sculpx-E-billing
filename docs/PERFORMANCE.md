# Performance Guidelines & Optimization Strategy

> **Target:** 60fps interaction speed, <1.8s LCP on mobile 4G, zero cumulative layout shift (CLS).

---

## 1. Core Web Vitals Targets
- **Largest Contentful Paint (LCP)**: ≤ 1.8s
- **Interaction to Next Paint (INP)**: ≤ 100ms
- **Cumulative Layout Shift (CLS)**: ≤ 0.05
- **Total Blocking Time (TBT)**: ≤ 150ms

---

## 2. Image Optimization Rules
1. **Next.js `<Image>` Component**: Never use unoptimized raw `<img>` tags for catalog assets.
2. **Explicit Dimensions & Aspect Ratios**: Prevent layout shift by providing explicit `aspect-[4/3]` or `aspect-square` containers with `object-cover`.
3. **Priority Hero Images**: For the top banner and first 4 menu item cards above the fold, mark with `priority`.
4. **Modern Formats**: Serve WebP and AVIF automatically via the Next.js image optimization pipeline with graceful SVG placeholders.

---

## 3. Server Component Architecture & Bundle Size
- **Minimal `"use client"` Directives**: Keep layout shells and static wrappers as React Server Components where possible; isolate client interactivity to interactive buttons, steppers, and modals.
- **Dynamic Imports (`next/dynamic`)**:
  - Heavy modal surfaces (e.g., `ModifierModal`, `PaymentModal`) are lazily loaded on user interaction.
  - POS, KDS, and Admin routes reside in distinct code-split bundles.
- **Tree-Shaking**:
  - Import Lucide icons selectively: `import { ShoppingBag, UtensilsCrossed } from "lucide-react"`.
  - Zero heavy monolithic utility dependencies.

---

## 4. Query Caching & Numeric Formatting
- **Search Debouncing**: Menu search queries use a 300ms debounce hook to prevent thrashing search filters.
- **Cache Deduplication**: TanStack Query automatically deduplicates duplicate in-flight requests for identical query keys.
- **Tabular Numerics**: All numeric values (prices, timers, tax calculations) utilize `.tabular-nums` to eliminate micro-horizontal layout shifts when values increment or decrement.

---

## 5. WebSocket Connection Lifecycle
- **Single Connection Instance**: Centralized connection hook ensures 1 tab = 1 WebSocket instance.
- **Lightweight Event Payloads**: WebSocket frames contain entity IDs and status changes, triggering granular TanStack Query cache invalidations rather than transmitting multi-megabyte payloads over mobile data streams.
- **Backoff & Reconnect**: Exponential backoff reconnect policy guarantees battery and data efficiency during intermittent hotel Wi-Fi disconnects.
