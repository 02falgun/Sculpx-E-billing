# Accessibility (a11y) Guidelines — WCAG 2.1 AA Compliance

> **Standard:** Built-in accessibility across Customer, Staff, Kitchen, and Admin touchpoints.

---

## 1. Compliance Standard
The frontend targets full **WCAG 2.1 Level AA** compliance across all customer and staff screens.

---

## 2. Core Accessibility Pillars

### 2.1 Semantic HTML Structure
- Use landmark elements: `<main>`, `<header>`, `<nav>`, `<aside>`, `<footer>`, and `<section>`.
- Strict heading hierarchy: exactly one `<h1>` per view, nested sequentially through `<h2>`, `<h3>`, and `<h4>`.
- Table data uses `<table>`, `<thead>`, `<tbody>`, `<th scope="col">`, and `<td className="tabular-nums">`.

### 2.2 Keyboard Navigation & Focus Management
- **Focus Rings:** Distinct 2px focus ring (`focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:outline-none`) on all buttons, links, inputs, and custom pills.
- **Logical Tab Flow:** Seamless sequential traversal without keyboard traps.
- **Dialog & Drawer Traps:** Modals trap focus while open; pressing `Escape` dismisses the overlay and returns focus to the initiating trigger.

### 2.3 Non-Color-Dependent Information Design
- Never convey state through color alone.
- Status badges combine:
  1. A 6px solid dot indicator
  2. Distinct text label (e.g. `Preparing in Kitchen`, `Paid & Settled`)
  3. High-contrast border and background tone meeting the 4.5:1 contrast ratio.
- Dietary indicators combine icon shapes (Square with dot for Veg, triangle for Non-Veg) plus explicit text labels.

### 2.4 Screen Reader Support (ARIA)
- **Descriptive Labels:** All icon-only triggers include unambiguous `aria-label` or `title` attributes (e.g., `aria-label="Increase quantity of Paneer Tikka"`).
- **Live Regions:** Status transitions in `<OrderStatusTimeline />` and kitchen updates trigger `aria-live="polite"` announcements so screen readers notify users of order progress without interruption.
- **Form Validation:** Input errors leverage `aria-invalid="true"` and `aria-describedby="error-message-id"`.

### 2.5 Motion & Vestibular Safety
- Full `@media (prefers-reduced-motion: reduce)` support:
  - Disables slide-in translations and pulse keyframes.
  - Switches to instant opacity fades (0–100ms) for users with motion sensitivity.

### 2.6 Touch Ergonomics
- Minimum hit target of `44px × 44px` on all mobile customer buttons, KDS kitchen checklist rows, and POS steppers.
- Ample touch padding between adjacent interactive triggers to prevent mis-taps.
