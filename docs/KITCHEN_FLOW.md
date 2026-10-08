# Kitchen Flow (KOT & KDS)

## 1. Kitchen Display System (KDS) Lifecycle

The Kitchen Display System operates as a high-visibility, touch-optimized station for line cooks and kitchen expediters.

```mermaid
stateDiagram-v2
    [*] --> NEW: WebSocket Push: KOT_CREATED
    NEW --> ACCEPTED: Chef taps "Accept" / Acknowledged
    ACCEPTED --> PREPARING: Station starts cooking
    PREPARING --> READY: Food plated & ready at pass
    READY --> SERVED: Picked up by runner / waiter
    SERVED --> [*]

    NEW --> CANCELLED: Order cancelled / voided
    ACCEPTED --> CANCELLED: Order cancelled / voided
    PREPARING --> CANCELLED: Manager void authorization
```

---

## 2. Real-Time Multi-Station Synchronization

```mermaid
sequenceDiagram
    participant Guest as Customer / POS Staff
    participant Server as Order Backend
    participant WS as WebSocket Hub
    participant KDS1 as Kitchen Station (Hot Kitchen)
    participant KDS2 as Kitchen Station (Bar / Cold)
    participant Printer as Kitchen Thermal Printer

    Guest->>Server: Place Order (Items: Steak, Martini)
    Server->>Server: Generate KOT-101 (Steak) & KOT-102 (Martini)
    Server->>Printer: Dispatch EscPos Print Job
    Server--)WS: Broadcast KOT_CREATED
    WS--)KDS1: Push KOT-101 (Hot Line)
    WS--)KDS2: Push KOT-102 (Bar Station)

    KDS1->>Server: PATCH /kitchen/kots/101/status { status: "PREPARING" }
    Server--)WS: Broadcast KOT_UPDATED
    WS--)Guest: Live status moves to "Preparing in Kitchen"

    KDS1->>Server: PATCH /kitchen/kots/101/status { status: "READY" }
    Server--)WS: Broadcast KOT_UPDATED
    WS--)Guest: Audio chime & notification "Order Ready for Pickup"
```
