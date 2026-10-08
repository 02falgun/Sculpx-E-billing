# SCULPX E-Billing: QR Code Generation & Routing Architecture

## 1. Overview
The QR subsystem powers contactless customer dining across restaurant dining tables and hotel guestrooms. Every QR code encodes an authoritative URL that dynamically resolves the dining context without manual customer input.

---

## 2. Route Conventions

### Table Dining:
- Format: `/menu/table/[tableId]`
- Examples: `/menu/table/T01`, `/menu/table/T05`
- Header Display: `Dining at Table 05`
- Destination: Resolves to table section (e.g. Heritage Pavilion, Main Dining)

### In-Room Dining:
- Format: `/menu/room/[roomId]`
- Examples: `/menu/room/301`, `/menu/room/302`
- Header Display: `In-room dining · Room 301`
- Destination: Resolves to suite floor and guestroom folio

### Direct Token Lookup:
- Format: `/menu/[qrToken]`
- Examples: `/menu/table-token-5`, `/menu/room-token-301`

---

## 3. Real Frontend QR Generator (`/admin/qr`)
Located at `/admin/qr` and powered by `src/features/admin/QRCodeGeneratorManager.tsx`:

- **Real Scannable QR Codes**: Uses the official `qrcode` library with Level H (30% error correction) redundancy.
- **High-Resolution PNG Download**: One-click download of 600px square PNGs ready for print production.
- **Printable Tent Card Mockup**:
  - Restaurant Table Spec:
    ```
    SCULPX
    SCAN TO ORDER
    [ REAL SCANNABLE QR ]
    Table 05
    Scan with your phone to browse our menu and order.
    ```
  - In-Room Service Spec:
    ```
    SCULPX
    IN-ROOM DINING
    [ REAL SCANNABLE QR ]
    Room 301
    Scan to order from our restaurant directly to your room.
    ```
- **Copy Customer URL**: Copies full absolute URL with toast notification.
- **Open Live Customer Menu**: Opens the exact `/menu/table/[tableId]` or `/menu/room/[roomId]` customer experience in a new tab.
- **Fleet Directory**: Searchable, filterable list of all 8 dining tables and 5 suites with active/inactive toggles.
