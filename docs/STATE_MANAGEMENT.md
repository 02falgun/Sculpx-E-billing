# State Management Strategy

## 1. Dual-Layer State Management Architecture

State is cleanly split into **Server State** (authoritative server data) and **Client State** (ephemeral UI interactions and drafts).

```mermaid
graph TD
    subgraph ClientState["Client State (Zustand)"]
        CartStore["Cart Store (Items, Modifiers, Local Session)"]
        POSStore["POS Draft Store (Active Table, Order Draft)"]
        UIStore["UI Preferences (Theme, Modals, Drawer states)"]
    end

    subgraph ServerState["Server State (TanStack Query v5)"]
        MenuQuery["Menu & Categories Cache"]
        OrdersQuery["Active Orders & Detail Cache"]
        KitchenQuery["KDS KOT Cache"]
        BillingQuery["Bill & Payment Ledgers"]
        InventoryQuery["Stock Levels & Recipes"]
        PrinterQuery["Printer Status & Queue"]
    end

    subgraph Events["Live Real-Time Stream (WebSockets)"]
        WSEvents["ORDER_*, KOT_*, BILL_*, PRINT_*"]
    end

    WSEvents -->|queryClient.invalidateQueries()| ServerState
    ServerState --> UIViews["React UI Components"]
    ClientState --> UIViews
```

---

## 2. Server State: TanStack Query

All asynchronous backend data is managed via `@tanstack/react-query`:
- **Query Keys Structure**:
  - `["menu", "context", qrToken]`
  - `["menu", "categories"]`
  - `["menu", "items", { categoryId, search }]`
  - `["orders", orderId]`
  - `["orders", "list", { status, qrType, page }]`
  - `["kitchen", "kots"]`
  - `["bills", billId]`
  - `["printers"]`
  - `["print-jobs", { status }]`
- **Garbage Collection & Stale Time**:
  - Menu data: `staleTime: 5 * 60 * 1000` (5 minutes)
  - Order details: `staleTime: 10 * 1000` (10 seconds, refreshed on WS)
  - KOT queue: `staleTime: 0` (instant real-time freshness)
- **Automatic Invalidation**: Incoming WebSocket events selectively trigger `queryClient.invalidateQueries(...)` for targeted keys without reloading unimpacted data.

---

## 3. Client State: Zustand Stores

Zustand handles pure ephemeral client state with zero boilerplate:
1. `useCartStore`:
   - Holds active items, selected modifiers, quantities, and customer instructions.
   - Synchronizes with LocalStorage for session recovery if mobile browser tabs are refreshed.
2. `usePOSStore`:
   - Holds the waiter's currently selected table and draft order lines prior to sending to kitchen.
3. `useUIStore`:
   - Active modals, drawer visibility, and toast queues.
