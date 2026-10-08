# Component Architecture

## 1. Design System Structure

All presentation components adhere to atomic component principles:

```text
src/components/
├── ui/              # Primitives (independent of any domain logic)
│   ├── Button
│   ├── Input
│   ├── Select
│   ├── Dialog
│   ├── Drawer
│   ├── Modal
│   ├── Card
│   ├── Badge
│   ├── Tabs
│   ├── Table
│   ├── Dropdown
│   ├── Toast
│   ├── Skeleton
│   ├── Spinner
│   ├── EmptyState
│   ├── ErrorState
│   ├── StatusBadge
│   ├── ConfirmDialog
│   ├── Pagination
│   └── SearchInput
├── layout/          # App-wide layouts and structural shells
│   ├── CustomerHeader
│   ├── StaffNavigation
│   ├── KitchenHeader
│   └── AdminSidebar
└── shared/          # Reusable domain-adjacent elements
    ├── CurrencyDisplay
    ├── QRLiveIndicator
    └── DietIndicator
```

---

## 2. Feature Components by Domain

Feature components live exclusively inside their feature modules under `src/features/`:

| Feature Module | Key Components |
| :--- | :--- |
| **menu** | `MenuItemCard`, `ModifierModal`, `CategoryScroll`, `SearchFilterBar` |
| **cart** | `CartDrawer`, `CartItemRow`, `CartSummary`, `ModifierSummaryTag` |
| **checkout** | `CheckoutForm`, `PaymentPreferenceToggle`, `SpecialInstructionsInput` |
| **orders** | `OrderCard`, `OrderStatusTimeline`, `CancelOrderDialog` |
| **kitchen** | `KOTCard`, `KDSBoard`, `KOTItemList`, `StationFilterTabs` |
| **billing** | `BillSummary`, `BillReceiptView`, `DiscountModal`, `SplitBillDialog` |
| **payments** | `PaymentSelector`, `RoomFolioInput`, `PaymentSuccessBanner` |
| **tables** | `TableCard`, `FloorGrid`, `TransferTableModal` |
| **rooms** | `RoomCard`, `RoomGrid`, `RoomStatusBadge` |
| **printers** | `PrinterStatusCard`, `PrintJobCard`, `PrintJobRetryButton` |
| **inventory** | `StockItemRow`, `LowStockAlert`, `StockAdjustmentModal` |
| **users** | `UserTable`, `RoleBadge`, `UserEditModal` |
| **reports** | `DailyRevenueCard`, `TopSellingItemsList`, `TaxSummaryTable` |

---

## 3. Component Rules
- **No Direct Fetching**: Never call `fetch()` directly in a component. Consume a dedicated custom hook (`useMenu`, `useOrder`, etc.).
- **Server Components by Default**: Pages and layout wrappers are React Server Components (RSC) unless interactivity (hooks, state, event handlers) requires `"use client"`.
- **Pure and Testable**: Keep presentation components pure with clean Props interfaces for frictionless unit and component testing.
