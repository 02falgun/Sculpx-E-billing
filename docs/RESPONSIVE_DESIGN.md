# Hotel & Restaurant QR E-Billing — Responsive Design System

> **Standard:** Responsive by Design. Tailored layouts for Mobile (Customer), Tablet (Staff/POS), Wall-Mount Displays (Kitchen), and Desktop (Admin).

---

## 1. Breakpoint Architecture

| Token | Breakpoint | Target Device / Persona | Primary Experience |
| :--- | :--- | :--- | :--- |
| **Mobile (`default` / `<640px`)** | `360px – 430px` | Customer (Smartphones: iPhone, Android) | Single-hand touch, sticky bottom CTAs, vertical scroll, horizontal category pills. |
| **Tablet (`sm` / `md`)** | `640px – 768px` | Floor Waiters & Captains (iPad Mini, Android Tablets) | 2-column POS, quick table switching, modal popovers. |
| **Landscape Tablet (`lg`)** | `1024px` | Cashier Desks & Kitchen Pass Stations | Split-pane billing ledger, 3-column KDS board. |
| **Desktop (`xl` / `2xl`)** | `1280px – 1920px` | Hotel Admin & Back-Office Managers | Full management sidebar, extensive data tables with max-width constraints. |

---

## 2. Touch Target Standards

- **Interactive Triggers:** Every clickable element (buttons, tabs, quantity steppers, checkbox rows) maintains a minimum hit box of `44px × 44px` on touch viewports (`touch-manipulation`).
- **No Pinch-to-Zoom Dependency:** All body text is `13px` or higher; form inputs maintain `16px` base equivalent on mobile focus to prevent unwanted iOS safari auto-zoom.
- **Thumb Zone Design:** Critical customer CTAs (`Add to Cart`, `Proceed to Checkout`, `Place Order`) sit within the lower 35% of the mobile viewport.

---

## 3. Responsive Patterns by Application Flow

### 3.1 Customer Mobile Flow (`/menu/[qrToken]`, `/cart`, `/checkout`, `/order/[orderId]`)
- **Sticky Top Bar:** Compact context pill (`Table 5` or `Room 301`) and live socket status.
- **Horizontal Category Tabs:** Scroll-snapped overflow pill bar (`overflow-x-auto scrollbar-none`).
- **Menu Card Grid:** Single column on mobile (`grid-cols-1`), expanding to dual column on tablets (`sm:grid-cols-2`).
- **Persistent Bottom Drawer Bar:** Floating bottom bar with live item count and subtotal, expanding smoothly into full checkout drawer.
- **Sticky Modal CTA:** Modifiers modal locks the quantity stepper and `[ Add to Cart · ₹X ]` button to the bottom on mobile screens.

### 3.2 Staff & POS Flow (`/dashboard`, `/pos`, `/tables`)
- **POS Split Layout:**
  - `<1024px`: Stacked tabbed view (Menu Catalogue view + Floating Ticket drawer trigger).
  - `≥1024px`: Dual-column layout (Left 60% Menu Grid, Right 40% Live Ticket Stepper and Fire KOT).
- **Table Grid:** Fluid auto-fitting columns (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`).

### 3.3 Kitchen KDS Flow (`/kitchen`)
- **Wall Mount / Bump Bar Display:**
  - Fluid multi-column board (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`).
  - High-contrast typography readable from 2-3 meters away.
  - Large touch targets for chefs with kitchen gloves or damp hands.

### 3.4 Admin Console (`/admin/*`)
- **Desktop Sidebar:** Fixed `w-64` vertical sidebar on desktop; collapsible drawer on mobile/tablet viewports.
- **Data Tables:** Horizontal scrolling wrapper with sticky column headers and right-aligned actions.
- **Print Tent Card:** Printable CSS media query (`@media print`) hides navigation and outputs high-resolution tent cards at standard 4×6 inch proportions.

---

## 4. Multi-Resolution Quality Checklist

- [x] **375px (iPhone SE / Standard Phone):** Zero horizontal page overflow, sticky bottom bars clear content, forms comfortable to fill.
- [x] **768px (iPad Portrait):** POS terminal tabs function smoothly, 2-column dish cards render cleanly.
- [x] **1024px (iPad Landscape):** POS 2-column split is active, KDS displays 3 columns of tickets.
- [x] **1440px+ (Desktop Monitor):** Admin and staff views constrained by `max-w-6xl` or `max-w-7xl` to prevent unreadable ultra-wide stretching.
