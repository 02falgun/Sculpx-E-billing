# Hotel & Restaurant QR E-Billing Design System

> **Standard:** Clean. Premium. Calm. Clear. Fast. Modern. Attractive. Professional. Never messy.

---

## 1. Design Philosophy & Visual Hierarchy

The interface reflects luxury hospitality with high-velocity restaurant operations:

```text
CLARITY  →  USABILITY  →  VISUAL HIERARCHY  →  CONSISTENCY  →  BEAUTY
```

- **Aesthetic Tone:** Warm architectural minimalism, premium hotel reception aesthetics, Apple-grade simplicity, and SaaS operational speed.
- **Zero Decorative Clutter:** Every border, badge, surface, and interaction exists for a functional reason. No gratuitous glassmorphism, floating gradients, or bouncy animations.

---

## 2. Color System

| Token | Hex / Tailored HSL | Role / Application |
| :--- | :--- | :--- |
| **Primary Brand** | `#b45309` (Amber 700) / `#d97706` (Amber 600) | Primary CTAs, active highlights, key navigation state |
| **Brand Surface Light** | `#fef3c7` (Amber 100) / `#fffbeb` (Amber 50) | Subdued badge backgrounds, focus accents |
| **Neutral Background** | `#f8fafc` (Slate 50) | Calm, eye-resting app foundation |
| **Neutral Surface** | `#ffffff` (Pure White) | Card containers, panels, data tables |
| **Elevated Surface** | `#ffffff` with subtle border & shadow-xs | Modal sheets, floating drawers, active dropdowns |
| **Primary Text** | `#0f172a` (Slate 900) | Headings, primary labels, item titles, totals |
| **Secondary Text** | `#475569` (Slate 600) | Descriptions, ingredient notes, timestamps |
| **Muted Text** | `#64748b` (Slate 500) | Secondary metadata, hints, breadcrumbs |
| **Border Subtle** | `#e2e8f0` (Slate 200) | Structural dividers, card borders |
| **Border Strong** | `#cbd5e1` (Slate 300) | Input fields, active boundaries |
| **Success** | `#059669` (Emerald 600) / `#047857` | Paid bills, completed orders, veg indicators |
| **Warning** | `#d97706` (Amber 600) / `#b45309` | Preparing tickets, pending bills, egg indicators |
| **Error / Destructive** | `#e11d48` (Rose 600) / `#be123c` | Cancelled orders, voided bills, non-veg indicators |
| **Info / Focus** | `#2563eb` (Blue 600) / `#1d4ed8` | System announcements, table selections |

---

## 3. Typography Scale

Typography establishes hierarchy before cards and borders do:

- **Display (Hero / QR Title):** `text-2xl sm:text-3xl font-extrabold tracking-tight`
- **Page Title:** `text-xl sm:text-2xl font-bold tracking-tight text-slate-900`
- **Section Title:** `text-base sm:text-lg font-semibold tracking-tight text-slate-900`
- **Card Title / Item Name:** `text-sm sm:text-base font-semibold text-slate-900`
- **Body:** `text-sm leading-relaxed text-slate-700`
- **Secondary / Subtext:** `text-xs text-slate-500`
- **Caption / Meta:** `text-[11px] font-medium text-slate-400`
- **Financial & Timers:** `.tabular-nums` ensures zero horizontal layout shifting during quantity or price changes.

---

## 4. Spacing, Radius & Elevation System

### Spacing Scale
Consistent 4px scale across the entire application:
- `gap-1.5` / `gap-2` (6px / 8px) for buttons, inline chips, status badges
- `gap-3` / `gap-4` (12px / 16px) for item lists, form rows, toolbar controls
- `gap-6` / `gap-8` (24px / 32px) for page sections and primary grid layouts

### Radius System
- `rounded-lg` (8px): Badges, small action buttons, table rows, input chips
- `rounded-xl` (12px): Standard cards, form inputs, dialog containers, drawer corners
- `rounded-2xl` (16px): Bottom action sheets, primary modal surfaces, mobile sticky bars
- `rounded-full` (9999px): Counter pills, round icon triggers

### Elevation & Shadows
- `shadow-xs` (`0 1px 2px rgba(0,0,0,0.05)`): Standard cards and subtle panels
- `shadow-sm` (`0 1px 3px rgba(0,0,0,0.07)`): Elevated popovers, active buttons
- `shadow-lg` / `shadow-xl`: Modal sheets and floating sticky mobile checkout bars

---

## 5. Component Standards

### Buttons (`<Button />`)
- **Primary:** Warm amber-gold with white text; tactile `:active` state.
- **Secondary:** Deep slate with crisp contrast for secondary actions.
- **Outline:** Pure white with subtle border; avoids heavy dark borders.
- **Ghost:** Clean hover fill for minimal icon actions.
- **Sizes:** `sm` (32px), `md` (38px), `lg` (44px), `icon` (36px).

### Cards (`<Card />`)
- Flat surfaces by default with `border border-slate-200/90`.
- Optional `interactive` prop triggers delicate border darkening and shadow on hover without jarring animations.

### Status Indicators (`<StatusBadge />`)
- Unified across Order, KOT, Bill, and Payment states.
- Includes a 6px status dot indicator to provide immediate color and shape distinction.

### Forms & Inputs (`<Input />`, `<Select />`, `<SearchInput />`)
- Consistent 40px height with clear 12px label hierarchy.
- Inline validation messages in calm rose tone.
- Clear search dismiss button.

### Tables (`<Table />`)
- Responsive scroll container with subtle headers (`text-slate-500 uppercase text-xs`).
- Smooth row hover (`hover:bg-slate-50/70`) with high vertical alignment clarity.
- Right-aligned numeric columns using `.tabular-nums`.

### Dialogs & Modals (`<Dialog />`)
- Backdrop: `bg-slate-950/60 backdrop-blur-xs` for calm focus isolation.
- Container: centered `rounded-2xl bg-white shadow-xl max-w-md sm:max-w-lg border border-slate-200/90`.
- Clear header with title, subtitle, and accessible close trigger (`Escape` key supported).
- Bottom sticky or right-aligned action row with primary action on the right.

### Navigation Architecture
- **Customer:** Clean sticky header with dining context pill (`<QRContextBadge />`) and socket sync status. Mobile persistent bottom bar for cart and order progress.
- **Staff:** Desktop top bar with dark slate background (`bg-slate-900`), high-contrast active state pills, direct KDS and Admin launch points, and session user badge.
- **Admin:** Collapsible vertical sidebar grouped into *Administration* (Catalog, Hardware, QR) and *Live Operations* (POS, KDS, Tables, Billing).

---

## 6. Animation & Micro-Interaction Rules

- **Subtle Durations:** All UI transitions use 150ms–200ms (`ease-out`). Avoid long >300ms transitions.
- **Zero Gratuitous Motion:** No continuously pulsing badges, bounce effects, or rotating icons during steady state.
- **Micro-Interactions:**
  - Button click: scale down slightly (`active:scale-[0.98]`).
  - Drawer slide-up: calm ease-out translation from bottom.
  - Hover states: delicate color shift (`transition-colors duration-150`).
- **Reduced Motion:** Full `@media (prefers-reduced-motion: reduce)` support: disables transitions and immediate layout shifts for users with vestibular sensitivities.

---

## 7. Accessibility (A11y) Rules

- **Semantic Structure:** Proper `h1` through `h4` hierarchy on all views; `<main>`, `<header>`, `<nav>`, `<aside>`, `<table>` semantics.
- **Touch Targets:** Minimum 44×44px interactive touch targets across all mobile and POS screens.
- **Focus Rings:** Distinct 2px focus ring (`focus-visible:ring-2 focus-visible:ring-amber-500/40 focus-visible:outline-none`) on all interactive buttons and inputs.
- **Color Contrast:** Minimum WCAG 2.1 AA ratio (4.5:1 for body copy, 3:1 for large display text and UI controls).
- **Screen Reader Labels:** All icon-only buttons include descriptive `aria-label` or `title` attributes.

---

## 8. Responsive Layout Architecture

- **Customer Flow (Mobile-First):** Optimized for 360px–430px smartphone viewports with single-hand reachability.
- **Staff & Floor (Tablet-First):** Optimized for 768px–1024px iPads and Android tablets in landscape orientation.
- **Kitchen (KDS):** High-contrast dark display tuned for 1080p wall mounts and bump bar stations.
- **Admin Console (Desktop):** Structured dashboard with max-w-7xl constraint preventing excessive widescreen stretch.

---

## 9. Operational Touchpoints & Print Specifications

1. **Customer Mobile Experience:**
   - 48px minimum touch targets on mobile viewports.
   - Sticky bottom action bars on mobile for cart total and direct checkout.
   - Instant search and lightweight horizontal category scroll with active indicators.

2. **Kitchen Display System (KDS):**
   - High-contrast dark theme optimized for grease-resistant commercial touch tablets.
   - Large typography (18px+ tickets) readable from 2-3 meters away.
   - Real-time overdue color shift (amber to rose) when cook time exceeds target minutes.

3. **POS & Staff Terminal:**
   - Fast 2-column split (Menu & Catalog vs Live Order Drawer).
   - Instant quantity increment/decrement with immediate subtotal updates.

4. **Print Optimization:**
   - Thermal 80mm & 58mm CSS print media query support (`.print:hidden`, pure white background, monospace itemized table).
