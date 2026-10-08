# System Architecture

## 1. High-Level System Overview
The platform uses a decoupled frontend-backend architecture. The Next.js frontend interacts with the authoritative backend services through REST APIs for idempotent queries and mutations, and through WebSockets for full-duplex, low-latency live events.

```mermaid
graph TD
    subgraph Clients["Client Tier (Frontend)"]
        MobileGuest["Mobile Guest (Room/Table QR)"]
        StaffTablet["Staff POS (Tablet/Desktop)"]
        KitchenScreen["Kitchen Display KDS (Touch Screen)"]
        AdminStation["Admin Console (Desktop)"]
    end

    subgraph Edge["Edge & Ingress Tier"]
        CDN["CDN / Edge Cache"]
        LoadBalancer["API Gateway & Reverse Proxy"]
    end

    subgraph Backend["Authoritative Backend Services"]
        AuthSvc["Auth & RBAC Service"]
        OrderSvc["Order & KOT Service"]
        BillingSvc["Billing & Tax Service"]
        PaymentSvc["Payment Gateway Service"]
        InventorySvc["Inventory & Recipe Service"]
        PrintSvc["Print Queue Service"]
        WSServer["WebSocket Notification Gateway"]
    end

    subgraph Data["Data & Hardware Tier"]
        DB[(Primary Relational DB)]
        Redis[(Redis Cache & Pub/Sub)]
        PrinterGW["Local Print Agent / EscPos Gateway"]
        PhysicalPrinters["Thermal Printers (Kitchen/Cashier)"]
    end

    MobileGuest -->|HTTPS / WSS| CDN
    StaffTablet -->|HTTPS / WSS| CDN
    KitchenScreen -->|HTTPS / WSS| CDN
    AdminStation -->|HTTPS / WSS| CDN

    CDN --> LoadBalancer
    LoadBalancer --> AuthSvc
    LoadBalancer --> OrderSvc
    LoadBalancer --> BillingSvc
    LoadBalancer --> PaymentSvc
    LoadBalancer --> InventorySvc
    LoadBalancer --> PrintSvc
    LoadBalancer --> WSServer

    OrderSvc --> DB
    BillingSvc --> DB
    PaymentSvc --> DB
    InventorySvc --> DB

    OrderSvc -->|Publish Event| Redis
    BillingSvc -->|Publish Event| Redis
    Redis -->|Broadcast| WSServer
    WSServer -.->|Push Updates| Clients

    PrintSvc --> PrinterGW
    PrinterGW --> PhysicalPrinters
```

---

## 2. Communication Protocols

| Channel | Protocol | Use Case | Guarantees |
| :--- | :--- | :--- | :--- |
| **Data Fetching & Mutations** | HTTPS / REST (JSON) | Initial loads, checkout validation, payments, admin CRUD | Idempotent, typed contract envelopes, auth tokens |
| **Live Broadcasts** | WSS (Secure WebSocket) | Order state changes, new KOT tickets, bill updates | Event deduplication, automatic reconnect with exponential backoff |
| **Printing** | Backend-mediated Queue | KOT and receipt generation | Frontend NEVER speaks directly to raw thermal sockets |

---

## 3. Resilience & Degradation Strategy
1. **WebSocket Degradation**: If WebSocket connection fails, TanStack Query automatically falls back to interval polling (window focus revalidation & stale-while-revalidate).
2. **Offline Detection**: PWA shell detects navigator connectivity changes and informs the user immediately to prevent lost cart or payment submissions.
3. **Optimistic Updates with Server Authority**: Client displays immediate feedback for actions like quantity increments, but final order placement waits for server confirmation.
