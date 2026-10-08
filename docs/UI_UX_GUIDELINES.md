# Hotel & Restaurant QR E-Billing — UI/UX Guidelines

> **Standard:** Clean. Premium. Calm. Clear. Fast. Modern. Attractive. Professional. Never messy.

---

## 1. Core Design Philosophy

Every screen in this platform follows a strict hierarchy:

```text
CLARITY
  ↓
USABILITY
  ↓
VISUAL HIERARCHY
  ↓
CONSISTENCY
  ↓
BEAUTY
```

### The Design Formula
**Premium Hospitality + Modern SaaS + High-Velocity Restaurant Operations**

- **Customer Mindset:** *"I am ordering at a luxury hotel restaurant. It feels fast, intuitive, trustworthy, and effortless."*
- **Staff Mindset:** *"I am operating at peak dinner rush. What needs my immediate attention? Every action takes minimal taps."*
- **Kitchen Mindset:** *"I can read ticket orders from 2 meters away. Timers tell me what's urgent instantly."*
- **Management Mindset:** *"Revenue, inventory 86s, and printer hardware are clearly under control."*

---

## 2. Global Anti-Patterns (What We Avoid)

- ❌ **No Floating Card Soup:** Do not wrap every single label or row in an isolated floating card. Prefer:
  ```text
  Page ├── Section │ ├── Content │ └── Content └── Section └── Content
  ```
- ❌ **No Gratuitous Glassmorphism or Heavy Gradients:** Maintain clean solid neutral foundations (`#f8fafc` background, `#ffffff` surfaces) with subtle borders (`#e2e8f0`).
- ❌ **No Continuous Pulsing or Bouncing Animations:** Keep transitions subtle (150ms–200ms) and purposeful.
- ❌ **No Ambiguous CTAs:** Buttons must communicate the exact action (e.g. `Pay ₹1,840 & Place Order` rather than generic `Continue`).
- ❌ **No Developer Jargon in Customer Views:** Display warm hospitality terms (e.g., `Table 5 • Heritage Dining Pavilion` instead of `TABLE_TOKEN_5`).

---

## 3. Screen-by-Screen UX Specifications

### 3.1 Customer Menu & Ordering
1. **Context Visibility:** The customer's dining context (`Table 5` or `Room 301`) must always remain visible in the top header without occupying excessive vertical space.
2. **Food as Hero:** Menu items prioritize appetising presentation with consistent aspect ratios, clear dietary tags (🟢 Veg, 🔴 Non-Veg, 🟡 Egg, 🌿 Vegan), prep times, and bold prices.
3. **Category Tabs:** Lightweight horizontal scrolling pills with instant filtered view.
4. **Merchandising Indicators:** Support `Chef's Special` and `Bestseller / Popular` without cluttering cards.

### 3.2 Food Item Customization (`ModifierModal`)
1. **Clear Choice Architecture:**
   - Single-choice groups (`maxSelections: 1`): Clean radio buttons.
   - Multi-choice add-ons (`maxSelections > 1`): Checkboxes with dynamic price tags (`+₹80`).
2. **Mobile Sticky Action Bar:** Sticky bottom container showing `[-] Qty [+]` stepper and dynamic `[ Add to Cart · ₹X ]` CTA.
3. **Special Instructions:** Accessible text input with common chef hints (`e.g., Less spicy, no cilantro`).

### 3.3 Cart & Checkout
1. **Clear Math Breakdown:** Subtotal ➔ Taxes (CGST + SGST) ➔ Service Charge ➔ Grand Total.
2. **Dual CTAs:** Prominent primary CTA (`Proceed to Checkout`) paired with an accessible secondary `Continue Browsing` action.
3. **Trustworthy Checkout:** Visually distinct selection between `Pay Now Online (UPI / Card)` and `Post to Room Folio / Pay Later`.
4. **Dynamic Place Order CTA:** Button clearly states `Pay ₹X & Place Order` or `Post ₹X to Folio & Confirm`.

### 3.4 Order Tracking (`Live Tracking`)
1. **Hero Timeline:** Linear progression: `Confirmed` ➔ `Accepted` ➔ `Preparing` ➔ `Ready` ➔ `Served`.
2. **Real-time Synchronization:** Update state seamlessly via WebSockets without jarring layout jumps.
3. **Guest Assistance:** Subtle, dignified helper trigger (`Need help? Call Reception / Contact Staff`).
4. **Order Again:** Quick repeat action for guest convenience.

### 3.5 Central Billing & Digital Receipt
1. **Official GST Invoice:** Certified receipt with GSTIN, FSSAI licence, itemized rate, tax percentages, and balance due.
2. **Tip Selector:** Frictionless gratuity presets (No Tip, 5%, 10%, ₹50, ₹100, Custom).
3. **Settlement Badge:** High-contrast certification when paid, instant PDF download, thermal print trigger, and WhatsApp receipt share.

### 3.6 Staff Dashboard & POS
1. **First Question Answered:** *"What needs my attention right now?"* (Orders waiting > 20 min, unassigned tables, overdue KOTs).
2. **High-Velocity 2-Column POS:** Instant category selection, search with auto-suggest, one-tap item increment, and immediate `Fire KOT to Kitchen`.
3. **Floor Tables Map:** Real-time occupancy pills (Available, Occupied, Billed, Reserved) with contextual order launch.

### 3.7 Kitchen Display System (KDS)
1. **High-Contrast Dark Surface (`bg-slate-950`):** Anti-glare and optimized for commercial kitchen environments.
2. **Distance Readability:** Minimum 18px ticket headers readable from 2-3 meters.
3. **Kitchen Checklist:** One-tap strike-through for completed items.
4. **Urgency Escalation:** Visual shift from dark slate ➔ amber (>10 min) ➔ rose alert (>15 min).

### 3.8 Admin Back-Office & Hardware
1. **Logical Navigation:** Grouped into *Administration* (Catalog, Hardware, QR) and *Live Operations* (POS, KDS, Tables, Billing).
2. **86 Sold-Out Controls:** One-click instant stock toggles.
3. **Printer Fleet Visibility:** Clear online/offline heartbeat, paper width indicators, and retryable print queues.

---

## 4. Typography Scale Reference

| Level | Size | Weight | Line Height | Application |
| :--- | :--- | :--- | :--- | :--- |
| **Display** | 24px–32px | Extrabold (800) | 1.15 | Hero headings, tent card branding |
| **Page Title** | 20px–24px | Bold (700) | 1.25 | View headers, invoice titles |
| **Section Title** | 16px–18px | Semibold (600) | 1.35 | Group headings, modal titles |
| **Card Title** | 14px–16px | Semibold (600) | 1.4 | Dish names, KOT ticket numbers |
| **Body** | 13px–14px | Regular (400) | 1.5 | Item descriptions, explanations |
| **Secondary** | 12px | Medium (500) | 1.4 | Timestamps, table meta, prices |
| **Caption** | 10px–11px | Bold (700) | 1.2 | Uppercase tags, category badges |

---

## 5. Spacing & Touch Ergonomics

- **Mobile Minimum Touch Target:** `44px × 44px` on all buttons, steppers, and checklist items.
- **Content Padding:** `p-4 sm:p-6 lg:p-8` for intentional whitespace.
- **Section Dividers:** Clean 1px borders (`border-slate-200/80`) with adequate vertical breathing room (`gap-6 sm:gap-8`).
