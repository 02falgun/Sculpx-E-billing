# Changelog

All notable changes to the Hotel Restaurant QR E-Billing platform will be documented in this file.

## [Phase 2: Customer Menu Implementation] - 2026-10-08

### Added
- **Dynamic Route `/menu/[qrToken]`**: Built responsive customer ordering route in `src/app/menu/[qrToken]/page.tsx` with layout in `src/app/menu/layout.tsx`.
- **Polymorphic QR Context Resolution**: Automatically validates and maps Room and Table tokens to hotel metadata and synchronizes with cart session.
- **QR Banner**: Built `QRBanner` displaying table/room number, dining mode, hotel branding, and digital e-bill indicator.
- **Horizontal Sticky Categories Navigation**: Built `CategoryTabs` with active item counts and smooth scrolling.
- **Menu Search & Dietary Filtering**: Implemented `MenuSearchAndFilter` with 300ms debouncing and `Veg Only`, `Non-Veg`, and `Chef's Specials` quick filters.
- **Rich Menu Item Card**: Implemented `MenuItemCard` with Indian standard dietary flags, spice meter, preparation time, and direct quick-add / customize triggers.
- **Modifier Modal Customization Engine**: Built `ModifierModal` supporting single-choice radio options, multi-choice add-ons, required selection enforcement, live price recalculations, and special instructions.
- **Catalog Container**: Built `MenuCatalog` coordinating banner, filters, category tabs, and loading skeletons / empty states.
- **Automated Verification**: Added 3 new test suites (`menuItemCard.test.tsx`, `modifierModal.test.tsx`, `categoryFiltering.test.ts`), bringing total to 29 passing assertions.
- **Architecture Decision Record**: Authored ADR-0006 for Customer Menu & Modifier Engine architecture.

## [Phase 1: Foundation Implementation] - 2026-10-08

### Added
- **Design System UI Primitives**: Implemented accessible components in `src/components/ui/` (`Button`, `Input`, `Select`, `Card`, `Badge`, `Dialog`, `Drawer`, `Tabs`, `Table`, `Spinner`, `Skeleton`, `EmptyState`, `ErrorState`, `ConfirmDialog`, `SearchInput`, `Pagination`, `ToastContainer`).
- **Domain-Shared Components**: Implemented `StatusBadge`, `DietIndicator`, `CurrencyDisplay`, and `QRContextBadge` in `src/components/shared/`.
- **Layouts & Navigation Shells**: Created `CustomerHeader` with live connection indicator, `CustomerBottomNav`, `StaffNavigation`, `KitchenHeader` with live clock and audio alerts, and `AdminSidebar`.
- **Root AppProviders**: Configured TanStack `QueryClientProvider`, global `CartDrawer`, and `ToastContainer` in `src/app/providers.tsx`.
- **Client State Stores**: Created `useCartStore` with automatic modifier calculation and persistent session, `usePOSStore`, `useAuthStore`, and `useUIStore`.
- **Service Factory & Mock Services**: Implemented `MockMenuService`, `MockOrderService`, `MockKitchenService`, `MockBillingService`, `MockPaymentService`, `MockInventoryService`, `MockPrinterService`, `MockRoomService`, `MockTableService`, `MockUserService`, and `MockAuthService` backed by realistic in-memory database `src/mocks/mockDb.ts`.
- **Centralized API Client**: Created `ApiClient` in `src/services/api/client.ts` with error normalization and timeout handling.
- **Centralized WebSocket Client**: Built `WebSocketManager` in `src/services/websocket/socket.service.ts` with exponential backoff, jitter, deduplication, and mock event simulation.
- **Custom React Hooks**: Implemented `useQRContext`, `useCategories`, `useMenuItems`, `useOrder`, `useCreateOrder`, `useCancelOrder`, `useActiveKOTs`, `useUpdateKOTStatus`, `useBill`, `useRecordPayment`, `useWebSocketConnection`, `useOrderUpdates`, `useKitchenUpdates`, `useBillingUpdates`, and `useDebounce`.
- **Landing Portal**: Created operational launchpad in `src/app/page.tsx` connecting all customer and staff entry points.
- **Testing & Verification**: Created 6 test suites with 22 assertions passing cleanly across stores, mock services, websockets, and components.
- **Architecture Decision Record**: Authored ADR-0005 for Foundation Layer choices.

## [Phase 0: Architecture & Foundation Design] - 2026-10-08

### Added
- **Project Scaffolding**: Initialized Next.js App Router, TypeScript, Tailwind CSS, TanStack Query, Zustand, React Hook Form, Zod, Vitest, and Playwright.
- **Directory Hierarchy**: Established `src/` modules, `components/`, `features/`, `services/`, `store/`, `hooks/`, `types/`, `schemas/`, and `docs/`.
- **Comprehensive Documentation Suite**: Authored 28 architectural specifications and manuals with Mermaid diagrams across all business domains.
- **Type System**: Created canonical TypeScript models for QRContext, Orders, Menu Items, KOTs, Bills, Payments, Inventory, and Printers.
- **Service Interfaces**: Specified typed contracts for `MenuService`, `OrderService`, `BillingService`, `PaymentService`, `KitchenService`, `InventoryService`, `PrinterService`, and `WebSocketService`.
- **Validation Schemas**: Created Zod schemas for runtime validation of QR context, order inputs, checkout forms, and payments.
- **Architecture Decision Records (ADRs)**: Documented ADR-0001 through ADR-0004 covering tech stack, reusable QR context, state separation, and WebSocket dispatching.
- **Verification Gates**: Established passing `tsc --noEmit` and Vitest suites.
