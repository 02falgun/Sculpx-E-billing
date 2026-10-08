# Thermal Printer Integration Architecture

## 1. Flow of Printing in Restaurant Operations

> **Frontend Boundary Rule**:
> The frontend NEVER communicates directly with physical thermal printers via raw TCP, Web Bluetooth, or USB sockets.
> All print jobs are queued through the backend API.

```mermaid
sequenceDiagram
    actor Cashier as Cashier / System Trigger
    participant UI as Frontend Billing / POS UI
    participant Hook as usePrintJob()
    participant API as Backend Print API
    participant Queue as Print Queue (Redis / DB)
    participant Gateway as Local Print Gateway / Agent
    participant Hardware as Physical Thermal Printer (80mm/58mm)

    Cashier->>UI: Clicks "Print Receipt" / "Reprint KOT"
    UI->>Hook: triggerPrint(payload)
    Hook->>API: POST /print-jobs { printerId, type, referenceId }
    API->>Queue: Enqueue PrintJob (Status: PENDING)
    API-->>Hook: 202 Accepted + { id, status: "PENDING" }
    
    Gateway->>Queue: Polls / Listens for Pending Jobs
    Queue-->>Gateway: Dispatches Raw ESC/POS Job
    Gateway->>Hardware: Sends ESC/POS byte stream via LAN / USB
    Hardware-->>Gateway: Hardware ACK / Print Complete
    Gateway->>API: PATCH /print-jobs/{id} { status: "COMPLETED" }
    API--)UI: WebSocket Event: PRINT_JOB_UPDATED
    UI->>UI: Updates job badge to "Printed Successfully"
```

---

## 2. Printer Fleet & Job Management
The admin and cashier UI provides:
1. **Fleet Health**: Shows whether kitchen, bar, and billing station printers are `ONLINE`, `OFFLINE`, or `LOW_PAPER`.
2. **Retry Mechanism**: If a printer jams or loses network connectivity, the job status moves to `FAILED`. Staff can click "Retry" directly from the UI.
3. **Reprint Audit Log**: Duplicate printings record the staff member who initiated the reprint and increment `retryCount` to prevent guest invoice duplication fraud.
