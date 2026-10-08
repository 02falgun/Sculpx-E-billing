# Customer Flow (QR Dine-In & Room Service)

## 1. End-to-End Customer Flow Diagram

```mermaid
flowchart TD
    Scan([Guest Scans QR Code]) --> Resolve[Resolve Context: /menu/[qrToken]]
    Resolve --> Menu[Browse Menu & Categories]
    Menu --> ItemModal[Open Item & Choose Modifiers]
    ItemModal --> Cart[Add to Cart & Review]
    Cart --> Checkout[Checkout Form & Preferences]
    Checkout --> PaymentChoice{Payment Choice}

    PaymentChoice -->|Pay Now| PayOnline[Digital Payment: UPI / Card / Gateway]
    PaymentChoice -->|Pay Later| PayLaterDecision{Context Type}

    PayLaterDecision -->|ROOM| RoomCharge[Post to Room Folio]
    PayLaterDecision -->|TABLE| CashCounter[Pay at Table / Cash Counter]

    PayOnline --> ValidateServer[Backend Order Validation]
    RoomCharge --> ValidateServer
    CashCounter --> ValidateServer

    ValidateServer --> OrderCreated[Order Confirmed: /order/[orderId]]
    OrderCreated --> LiveStatus[Live Status Timeline via WebSockets]
    LiveStatus --> Delivered[Items Served / Delivered]
    Delivered --> ViewBill[Access Itemized E-Bill: /bill/[billId]]
```

---

## 2. Order Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING_VALIDATION: Customer Submits Checkout
    PENDING_VALIDATION --> PLACED: Server Verifies Availability & Pricing
    PENDING_VALIDATION --> FAILED: Item Unavailable / Price Changed

    PLACED --> CONFIRMED: Kitchen / POS Auto or Manual Accept
    CONFIRMED --> PREPARING: Kitchen Starts Cooking (KOT Active)
    PREPARING --> READY: Food Prepared & Plated
    READY --> SERVED: Delivered to Table / Room
    SERVED --> COMPLETED: Bill Settled & Session Closed
    COMPLETED --> [*]

    PLACED --> CANCELLED: Customer / Staff Cancels
    CONFIRMED --> CANCELLED: Permitted with Kitchen Void
    CANCELLED --> [*]
```

---

## 3. Order Cancellation Flow

```mermaid
sequenceDiagram
    actor Guest as Customer
    participant UI as Order Status Screen
    participant Hook as useCancelOrder()
    participant Service as OrderService
    participant Server as Backend API

    Guest->>UI: Clicks "Cancel Order"
    UI->>UI: Prompts for Cancellation Reason
    Guest->>UI: Selects reason & confirms
    UI->>Hook: trigger cancellation
    Hook->>Service: cancelOrder(orderId, reason)
    Service->>Server: POST /orders/{id}/cancel
    alt Order is before PREPARING state
        Server-->>Service: 200 OK (Cancellation Approved)
        Service-->>Hook: Order Status CANCELLED
        Hook-->>UI: Display Cancellation Banner & Refund details (if Pay Now)
    else Order is already PREPARING or READY
        Server-->>Service: 400 Bad Request (Prep already started)
        Service-->>Hook: Error: "Cannot cancel - food is already cooking"
        Hook-->>UI: Display Alert with option to call floor staff
    end
```
