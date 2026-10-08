# Frontend Architecture

## 1. Architectural Layers & Separation of Concerns

The application strictly follows a 5-layer unidirectional architecture. Presentation components must never directly call `fetch()`, Axios, or raw WebSocket endpoints.

```mermaid
graph TD
    UI["1. Presentation Components (Atoms / UI / Layout)"]
    Features["2. Feature Components (MenuGrid, CartDrawer, KOTBoard)"]
    Hooks["3. Custom Hooks (useOrder, useCart, useKitchen)"]
    StateService["4. State & Service Layer (TanStack Query, Zustand, Service Interfaces)"]
    Transport["5. Transport & Network Layer (ApiClient, WebSocketManager)"]
    Backend["Authoritative Backend (REST + WebSockets)"]

    UI --> Features
    Features --> Hooks
    Hooks --> StateService
    StateService --> Transport
    Transport --> Backend
```

---

## 2. Directory Responsibilities

```text
src/
├── app/                  # Next.js App Router (pages, layouts, error/loading boundaries)
├── components/           # Reusable generic UI elements
│   ├── ui/               # Design system primitives (Button, Input, Badge, Dialog)
│   ├── layout/           # AppShell, Navbar, Sidebar, MobileFooter
│   └── shared/           # StatusBadges, CurrencyDisplay, EmptyStates
├── features/             # Business domain modules (contain domain components)
│   ├── menu/             # MenuCatalog, ItemCard, ModifierModal
│   ├── cart/             # CartSheet, CartSummary, CartItemRow
│   ├── checkout/         # CheckoutForm, PaymentPreferenceToggle
│   ├── orders/           # OrderTimeline, OrderCard, CancelDialog
│   ├── kitchen/          # KOTCard, KDSBoard, FilterBar
│   ├── billing/          # BillReceipt, DiscountModal, SplitBill
│   ├── payments/         # PaymentSelector, RoomFolioInput
│   ├── rooms/            # RoomGrid, RoomStatusBadge
│   ├── tables/           # FloorPlan, TableCard, TransferTableModal
│   ├── inventory/        # StockTable, RecipeEditor, RestockForm
│   ├── printers/         # PrinterList, PrintJobQueue, ReprintButton
│   ├── users/            # UserList, RoleBadge, UserForm
│   └── reports/          # DailySalesChart, CategoryBreakdown
├── services/             # Concrete data providers matching service interfaces
│   ├── api/              # REST clients (Mock implementations & Live Api implementations)
│   └── websocket/        # Connection manager, event dispatcher, reconnection
├── store/                # Zustand stores (Client-only state: Cart, Session, POS Draft)
├── hooks/                # Reusable React hooks bridging UI with Services & Stores
├── types/                # Canonical TypeScript models and interfaces
├── schemas/              # Zod validation schemas for forms and API payloads
├── constants/            # Routes, status definitions, navigation configs
├── utils/                # Pure formatting, currency, date, and math helpers
├── lib/                  # Shared utilities (cn, query-client)
└── config/               # App configuration & environment parsing
```

---

## 3. Data Flow Pattern

### Query Flow (Read)
```mermaid
sequenceDiagram
    participant Component as Feature Component
    participant Hook as useMenu() [TanStack Hook]
    participant Service as MenuService
    participant Client as ApiClient / MockApiClient
    participant Server as Backend / Mock API

    Component->>Hook: Request menu items
    Hook->>Service: getMenuItems({ categoryId })
    Service->>Client: get("/menu/items")
    Client->>Server: HTTP GET
    Server-->>Client: 200 OK + JSON { success: true, data: [...] }
    Client-->>Service: ApiResponse<MenuItem[]>
    Service-->>Hook: Validate / Unpack
    Hook-->>Component: data: MenuItem[], isLoading: false
```

### Mutation Flow (Write)
```mermaid
sequenceDiagram
    participant Component as CheckoutButton
    participant Hook as useCreateOrder()
    participant Service as OrderService
    participant WS as WebSocket Dispatcher
    participant Server as Backend Server

    Component->>Hook: mutate(orderPayload)
    Hook->>Service: createOrder(payload)
    Service->>Server: HTTP POST /orders
    Server-->>Service: 201 Created + Order
    Service-->>Hook: Return created Order
    Hook->>Component: Navigate to /order/[orderId]
    Server--)WS: Broadcast ORDER_CREATED event
    WS--)Hook: Invalidate ["orders"] & ["kot"] query caches
```
