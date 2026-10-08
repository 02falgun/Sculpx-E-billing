# Performance Guidelines & Optimization Strategy

## 1. Core Web Vitals Targets
The frontend is engineered to achieve top-tier performance on real mobile hardware (e.g. 4G/3G mobile networks at outdoor tables):
- **Largest Contentful Paint (LCP)**: ≤ 1.8s
- **Interaction to Next Paint (INP)**: ≤ 100ms
- **Cumulative Layout Shift (CLS)**: ≤ 0.05
- **First Input Delay (FID) / TBT**: ≤ 150ms

---

## 2. Image Optimization Rules
1. **Next.js `<Image>` Component**: Never use raw `<img>` tags.
2. **Explicit Dimensions & Aspect Ratios**: Prevent layout shift by providing explicit `width`, `height`, or `fill` with `sizes`.
3. **Priority Hero Images**: For the top banner and first 4 menu item cards above the fold, mark with `priority`.
4. **Modern Formats**: Serve WebP and AVIF automatically via Next.js image optimization pipeline.

---

## 3. Bundle Size & Code Splitting
- **Dynamic Imports (`next/dynamic`)**:
  - Heavy modals (e.g., `ModifierModal`, `DiscountModal`, `RecipeEditor`) are lazily loaded on user interaction.
  - POS and KDS routes are isolated in distinct route chunks.
- **Tree-Shaking**:
  - Import Lucide icons selectively: `import { ShoppingBag } from "lucide-react"`.
  - Avoid importing whole lodash or large utility libraries.

---

## 4. Query Caching & Debouncing
- **Search Debouncing**: Menu search queries use a 300ms debounce hook (`useDebounce`) to avoid thrashing backend search endpoints.
- **Cache Deduplication**: TanStack Query automatically deduplicates duplicate in-flight requests for identical keys.
- **Pagination & Virtualization**:
  - Staff order lists and inventory tables implement cursor or page-based slicing.
  - Large menu item catalogs (> 200 items) utilize windowed rendering where appropriate.

---

## 5. WebSocket Optimization
- **Message Throttling**: Batch or debounce rapid status events (such as multiple items completing at once).
- **Lightweight Payloads**: WebSocket frames contain entity IDs and status changes, triggering granular query invalidations rather than transmitting multi-megabyte snapshots over socket streams.
