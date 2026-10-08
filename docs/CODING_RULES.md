# Coding Rules & Engineering Standards

These rules are enforced across all phases of development. PRs violating these rules will be rejected at the phase gate.

---

## 1. Type Safety & TypeScript Strictness
- **No `any`**: The use of `any` is strictly prohibited. Use `unknown` with runtime type guards, Zod schemas, or generic type variables.
- **Centralized Types**: All domain entities must import from `@/types`. Do not redefine ad-hoc models inside component files.
- **Strict Null Checks**: Always handle `null` and `undefined` explicitly. Use optional chaining (`?.`) and nullish coalescing (`??`).

---

## 2. Component Design & React Conventions
- **Server Components by Default**: In Next.js App Router, keep all components as React Server Components unless client hooks (`useState`, `useEffect`, `useCartStore`, event listeners) are strictly needed.
- **Minimize `"use client"`**: Push client directives as far down the component tree as possible (to leaves, interactive buttons, or modals).
- **Small & Focused**: Any component exceeding 150 lines should be evaluated for refactoring into smaller sub-components.
- **No Direct Network Access**:
  - ❌ `useEffect(() => { fetch('/api/orders')... }, [])`
  - ✅ `const { data: orders } = useOrders();`
- **No Raw WebSocket Listeners in Components**: All real-time logic must use provided hooks (`useOrderUpdates`, `useKitchenUpdates`).

---

## 3. State Management Rules
- **Do Not Duplicate Server State**: Never copy TanStack Query cache values into `useState` or Zustand unless editing a local draft clone.
- **Eliminate Redundant `useEffect`**: Compute derived values directly in render or through `useMemo` instead of synchronizing state via effects.

---

## 4. Design System & Styling
- **Utility Consistency**: Use Tailwind CSS utility classes. Combine conditional styles strictly via `cn(...)` (`clsx` + `tailwind-merge`).
- **No Inline Styles**: Never use `style={{ ... }}` for static or layout styling.
- **Accessibility by Design**:
  - Every interactive button and link must have an accessible name or `aria-label`.
  - Modals and drawers must trap focus and close on `Escape`.
  - Forms must link labels to inputs with `htmlFor` and `id`.

---

## 5. File & Naming Conventions
- Component files: PascalCase (e.g., `MenuItemCard.tsx`, `OrderStatusTimeline.tsx`)
- Hook files: camelCase prefixed with `use` (e.g., `useCart.ts`, `useOrderUpdates.ts`)
- Service files: camelCase with `.service.ts` (e.g., `order.service.ts`)
- Schema files: camelCase with `.schema.ts` (e.g., `order.schema.ts`)
- Type files: kebab-case or camelCase under `src/types/` (e.g., `menu.ts`, `order.ts`)
