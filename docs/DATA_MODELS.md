# Data Models & Entity Relationships

## 1. Entity Relationship Diagram (Domain Model)

```mermaid
erDiagram
    QRContext ||--o{ Order : initiates
    Room ||--|| QRContext : contains
    Table ||--|| QRContext : contains

    Order ||--|{ OrderItem : contains
    Order ||--o{ KOT : dispatches
    Order ||--o| Bill : generates

    KOT ||--|{ KOTItem : contains

    Bill ||--|{ BillItem : items
    Bill ||--o{ Payment : receives
    Payment ||--o{ Refund : refunds

    MenuItem ||--o{ ModifierGroup : attaches
    ModifierGroup ||--|{ Modifier : offers
    Category ||--|{ MenuItem : categorizes

    InventoryItem ||--o{ RecipeIngredient : supplies
    Recipe ||--|{ RecipeIngredient : contains
    MenuItem ||--o| Recipe : mapped_to

    Printer ||--o{ PrintJob : executes
```

---

## 2. Core Entities Summary

### `QRContext`
The polymorphic anchor for both in-room dining and dining-room table ordering.
- `token`: Unique identifier encoded in the physical QR code.
- `type`: `"ROOM"` or `"TABLE"`.
- `identifier`: Room number (`"301"`) or table number (`"5"`).
- `displayName`: `"Room 301"` or `"Table 5"`.

### `Order`
Authoritative order record containing immutable snapshots of items, modifier selections, and price points at the exact time of order placement.
- `status`: `PENDING_VALIDATION | PLACED | CONFIRMED | PREPARING | READY | SERVED | COMPLETED | CANCELLED`.
- `paymentPreference`: `PAY_NOW | PAY_LATER`.

### `KOT` (Kitchen Order Ticket)
Routing unit for back-of-house kitchen operations. Multiple KOTs may belong to a single order (e.g., initial order + follow-up round).
- `status`: `NEW | ACCEPTED | PREPARING | READY | SERVED | CANCELLED`.

### `Bill` & `Payment`
E-Billing document containing itemized charges, authorized discounts, applicable taxes (CGST, SGST, service charge), and attached payment logs.
- `payments`: Array of `Payment` records supporting split payments across multiple methods (`CASH`, `CARD`, `UPI`, `ROOM_CHARGE`).
