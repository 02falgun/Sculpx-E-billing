# Changelog

All notable changes to the Hotel Restaurant QR E-Billing platform will be documented in this file.

## [Phase 9: Admin Back-Office, Hardware Fleet & QR Provisioning] - 2026-10-09

### Added
- **Admin Layout & Navigation (`/admin`)**: Built persistent responsive admin shell in `src/app/admin/layout.tsx` with `AdminSidebar` containing deep navigation and direct links to POS, Floor, and KDS.
- **Admin Dashboard Overview (`AdminDashboardOverview`)**: Executive dashboard tracking today's gross revenue, active orders, live table occupancy, printer network health, and category performance.
- **Menu Catalog Management Route (`/admin/menu`)**: Built `MenuCatalogManager` enabling item search, category filtering, price inspection, 86-list instant availability toggling, and new dish creation.
- **Thermal Printer Fleet Management Route (`/admin/printers`)**: Built `PrinterFleetManager` managing ESC/POS network and USB thermal printers across KOT, Bar, and Front Cashier with live status badges, paper level indicators, and a print job history queue with instant retry.
- **QR Code Tent Card Provisioning Route (`/admin/qr`)**: Built `QRCodeGeneratorManager` generating dynamic SVG QR codes with table badges, deep-linked URLs, live single-table previews, and print-ready multi-table tent cards.
- **Custom Hardware Hooks**: Added `usePrinters`, `usePrintJobs`, `useCreatePrintJob`, `useRetryPrintJob` in `src/hooks/usePrinters.ts`.
- **Automated Verification**: Added 3 new test suites (`menuCatalogManager.test.tsx`, `printerFleetManager.test.tsx`, `printerManagement.test.ts`), bringing total to 80 passing assertions across 31 suites.
- **Architecture Decision Record**: Authored ADR-0013 for Admin Back-Office Operations, Hardware Fleet Management & QR Provisioning.

## [Phase 8: Active Orders Management & Settlement Billing Desk] - 2026-10-09

### Added
- **Active Orders Management Route (`/orders`)**: Dedicated operational view in `src/app/(staff)/orders/page.tsx` for waiters and shift supervisors.
- **Orders List Component (`OrdersList`)**: Features lifecycle stage tabs (All Orders, Preparing, Food Ready, Served, Cancelled), search by order number or guest, order source tags (`CUSTOMER_QR` vs `STAFF_POS`), and live tracking link.
- **Cashier Billing Desk Route (`/billing`)**: High-efficiency billing desk in `src/app/(staff)/billing/page.tsx` monitoring open guest accounts and settlements.
- **Billing Desk Table Component (`BillingDeskTable`)**: Real-time KPI summary (Outstanding Due, Collected Today, Total Bills Issued), quick tab filters (Unsettled Tabs, Paid & Settled, All Invoices), and instant thermal receipt printing simulation.
- **Custom Hook `useAllBills`**: Added paginated bill querying and real-time polling to `src/hooks/useBilling.ts`.
- **Automated Verification**: Added 3 new test suites (`ordersList.test.tsx`, `billingDeskTable.test.tsx`, `billingDeskLedger.test.ts`), bringing total to 76 passing assertions across 28 suites.
- **Architecture Decision Record**: Authored ADR-0012 for Active Orders & Billing Desk.

## [Phase 7: Kitchen Display System (KDS) & Real-Time KOT Workflow] - 2026-10-09

### Added
- **Kitchen Display System Route (`/kitchen`)**: High-contrast, paperless touchscreen KDS route in `src/app/kitchen/page.tsx` with layout in `src/app/kitchen/layout.tsx`.
- **Live Expedite Clock & Header (`KitchenHeader`)**: Displays digital second-by-second clock, active ticket badge, audio toggle, and WebSocket connection status.
- **KOT Elapsed Timer Widget (`KOTTimer`)**: Calculates elapsed preparation minutes with color-coded urgency tiers (normal <10m, warning 10-15m, urgent >15m with pulsing alert).
- **Interactive Line Cook Ticket Card (`KOTCard`)**: Displays KOT number, parent order number, table/room dining context, modifiers, special instructions, and item-level click-to-strike checkmarks.
- **Kitchen Expedite Action Progression**: Buttons progress KOT stages (`NEW` ➔ `ACCEPTED` ➔ `PREPARING` ➔ `READY` ➔ `SERVED`), automatically removing completed tickets.
- **KDS Board Filter System (`KDSBoard`)**: Stage filtering across All Active, New / Pending, Cooking, and Ready for Pickup.
- **Automated Verification**: Added 3 new test suites (`kotTimer.test.tsx`, `kotCard.test.tsx`, `kitchenKOTLifecycle.test.ts`), bringing total to 72 passing assertions across 25 suites.
- **Architecture Decision Record**: Authored ADR-0011 for Kitchen Display System & KOT Lifecycle.

## [Phase 6: Staff POS & Floor Table Management] - 2026-10-09

### Added
- **Staff Operations Route Group (`(staff)`)**: Built shared staff layout in `src/app/(staff)/layout.tsx` featuring `StaffNavigation` and instant demo session authentication.
- **Floor Tables & Layout Route (`/tables`)**: Visual interactive floor plan with real-time occupancy metrics (Total Tables, Available, Occupied, Reserved).
- **Table Card Component (`TableCard`)**: Displays section, capacity, active orders, linked bills, quick "Take Order" / "Add to Order" action, and inline status update selector (`AVAILABLE`, `OCCUPIED`, `RESERVED`, `BILLED`).
- **Table Grid Management (`TableGrid`)**: Section filtering (Main Dining, Terrace Bar, Private Dining), real-time search, and responsive cards grid.
- **Staff Point of Sale Route (`/pos`)**: Fast waiter order entry screen in `src/app/(staff)/pos/page.tsx`.
- **POS Terminal Widget (`POSTerminal`)**: Dual-mode targeting (Tables vs Room Service), categorized menu browsing with search, quantity steppers, special kitchen notes, and direct KOT dispatching.
- **Staff Overview Dashboard (`/dashboard`)**: Floor occupancy percentage, active tables overview, and quick launchpads to POS, Floor Tables, and KDS.
- **Custom Hooks**: Added `useTables`, `useUpdateTableStatus`, `useRooms`, and `useUpdateRoomStatus` in `src/hooks/useTables.ts`.
- **Automated Verification**: Added 3 new test suites (`tableCard.test.tsx`, `tableGrid.test.tsx`, `tableManagement.test.ts`), bringing total to 64 passing assertions across 22 suites.
- **Architecture Decision Record**: Authored ADR-0010 for Staff POS and Floor Table Management.

## [Phase 5: Digital E-Billing & Payment Portal] - 2026-10-09

### Added
- **Digital E-Bill Route (`/bill/[billId]`)**: Created responsive e-bill and payment portal in `src/app/bill/[billId]/page.tsx` with print-friendly layout in `src/app/bill/layout.tsx`.
- **Official GST Tax Invoice Header (`InvoiceHeader`)**: Formatted with hotel branding, address, GSTIN, FSSAI license credentials, and dining location badge.
- **Itemized Bill & Tax Segregation (`InvoiceItemsTable`)**: Item descriptions, rates, quantities, subtotals, CGST (2.5%), SGST (2.5%), round-off, and dynamic due balance.
- **Interactive Gratuity Selector (`TipSelector`)**: Quick presets (No Tip, 5%, 10%, ₹50, ₹100, Custom) with real-time net payable recalculation.
- **Multi-Channel Payment Settlement Modal (`PaymentModal`)**: Integrated UPI QR with copyable VPA, simulated card payment with test autofill, Room Folio charges, and Cash Desk settlements.
- **Post-Payment Verified Seal & Rating (`DigitalReceiptActions`)**: Renders verified settlement seal, PDF/print trigger, WhatsApp/SMS share modal, and 5-star customer experience feedback form.
- **Automated Verification**: Added 3 new test suites (`invoiceItemsTable.test.tsx`, `tipSelector.test.tsx`, `paymentSettlement.test.ts`), bringing total to 56 passing assertions across 19 suites.
- **Architecture Decision Record**: Authored ADR-0009 for Digital E-Billing and Multi-Channel Payment Settlement Portal.

## [Phase 4: Customer Live Order Tracking & WebSocket Integration] - 2026-10-08

### Added
- **Live Order Tracking Route (`/order/[orderId]`)**: Created dynamic order tracking route in `src/app/order/[orderId]/page.tsx` with layout in `src/app/order/layout.tsx`.
- **Live Tracking Header (`LiveTrackingHeader`)**: Displays order number, table/room dining badge, placed timestamp, and real-time WebSocket connection state indicator.
- **5-Stage Visual Progress Timeline (`OrderStatusTimeline`)**: Built interactive lifecycle pipeline (`PLACED` ➔ `CONFIRMED` ➔ `PREPARING` ➔ `READY` ➔ `SERVED`), animated pulse for active stage, estimated preparation countdowns, and cancellation alerts.
- **Itemized Order Review (`OrderItemsReview`)**: Displays ordered dishes, selected modifiers, chef notes, item subtotals, 5% GST, and payment preference badges.
- **Order Cancellation Guard (`OrderCancelModal`)**: Provides structured cancellation reasons with strict kitchen guardrails (preventing mid-cooking cancellation if dishes are in preparation).
- **Interactive Action Bar**: Direct transitions to add more dishes (`/menu/[qrToken]`), summon floor captain with toast feedback, and view digital e-bill (`/bill/[billId]`).
- **Automated Verification**: Added 4 new test suites (`orderStatusTimeline.test.tsx`, `orderItemsReview.test.tsx`, `orderCancelModal.test.tsx`, `orderLifecycle.test.ts`), bringing total to 50 passing assertions.
- **Architecture Decision Record**: Authored ADR-0008 for Customer Live Order Tracking & WebSocket Integration.

## [Phase 3: Cart & Checkout Implementation] - 2026-10-08

### Added
- **Cart Review Page (`/cart`)**: Created full-page cart review in `src/app/cart/page.tsx` with layout in `src/app/cart/layout.tsx`.
- **Cart Review List Widget (`CartReviewList`)**: Built itemized list featuring item quantities, stepper controls, modifier breakdown, clear cart action, and direct transition to checkout.
- **Checkout Page (`/checkout`)**: Created responsive checkout route in `src/app/checkout/page.tsx` with layout in `src/app/checkout/layout.tsx`.
- **Context-Adaptive Payment Preferences (`PaymentPreferenceSelector`)**: Dynamically offers "Post to Room Folio" for in-room hotel guests versus "Pay Later at Table" for restaurant table diners, alongside "Pay Now Online".
- **Itemized Order Summary (`OrderSummaryCard`)**: Comprehensive breakdown with itemized subtotals, 5% estimated GST, and total calculation.
- **Authoritative Pre-Checkout Form (`CheckoutForm`)**: Powered by React Hook Form and Zod, performing backend pre-validation (`orderApi.validateOrder`) before order creation, clearing cart upon placement, and redirecting to live order tracking.
- **Automated Verification**: Added 3 test suites (`checkoutSchema.test.ts`, `paymentPreference.test.tsx`, `orderSummaryCard.test.tsx`), bringing total to 37 passing assertions.
- **Architecture Decision Record**: Authored ADR-0007 for Cart Review, Checkout Form, and Payment Preferences.

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
