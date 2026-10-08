# Accessibility (a11y) Guidelines

## 1. Compliance Standard
The frontend targets **WCAG 2.1 AA** compliance across all customer and staff screens.

---

## 2. Accessible Design Implementation
- **Semantic HTML**: Proper use of `<main>`, `<nav>`, `<article>`, `<header>`, `<footer>`, `<dialog>`, and `<button>`.
- **Keyboard Navigation**:
  - All interactive elements must be focusable and reachable via `Tab` key.
  - Visible focus rings with high-contrast outline (`focus-visible:ring-2 focus-visible:ring-offset-2`).
  - Modal dialogs must trap focus until dismissed.
- **Color Contrast**: Text must meet or exceed a 4.5:1 contrast ratio against background elements (3:1 for large headings).
- **Screen Reader Support**:
  - Image assets include descriptive `alt` text.
  - Icon-only buttons (like cart delete or quantity modifiers) feature explicit `aria-label="Increase quantity of Margherita Pizza"`.
  - Live status notifications use `aria-live="polite"` so screen reader users are notified when an order transitions to `PREPARING` or `READY`.
- **Touch Target Sizes**: Minimum 44x44px touch targets on all mobile and tablet interactive buttons.
