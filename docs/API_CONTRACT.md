# SCULPX E-Billing — REST API Contract Specification

> **Base URL Convention**: `/api/v1` (Configured via `NEXT_PUBLIC_API_URL`)  
> **Protocol**: HTTPS / JSON (`Content-Type: application/json; charset=utf-8`)  
> **Status**: Comprehensive Proposed Specification for Node.js + PostgreSQL Backend  

---

## 1. Global Architectural Standards

### 1.1 Response Envelope Structure
All JSON responses adhere to the standard envelope:

#### Success Envelope (`200 OK`, `201 Created`):
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

#### Paginated Success Envelope:
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 142,
      "totalPages": 8,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```

#### Error Envelope (`4xx`, `5xx`):
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request contains invalid parameters.",
    "details": [
      {
        "field": "items[0].quantity",
        "issue": "Must be greater than 0"
      }
    ],
    "timestamp": "2026-10-10T15:00:00.000Z"
  }
}
```

### 1.2 Authentication & Authorization Headers
- Public customer endpoints: No authentication header required.
- Internal staff endpoints:
  ```http
  Authorization: Bearer <jwt_access_token>
  ```
- Mutating endpoints support Idempotency:
  ```http
  Idempotency-Key: <uuidv4_or_unique_client_key>
  ```

---

## 2. Authentication & Session Endpoints

### 2.1 `POST /auth/login`
- **Purpose**: Authenticate internal staff member via email & PIN/password.
- **Auth**: None (Public).
- **Request Body**:
  ```json
  {
    "email": "waiter@demo.com",
    "pinOrPassword": "••••••••"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "usr-demo-waiter",
        "name": "Rahul Sharma",
        "email": "waiter@demo.com",
        "role": "WAITER",
        "phoneNumber": "+91 98765 43211",
        "isActive": true,
        "permissions": ["view_tables", "create_orders", "pos_access", "request_bill"]
      },
      "token": "eyJhbGciOiJIUzI1NiIsIn...",
      "expiresAt": "2026-10-11T15:00:00.000Z"
    },
    "message": "Welcome back, Rahul Sharma"
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: `{ "code": "INVALID_CREDENTIALS", "message": "Invalid email or PIN" }`
  - `403 Forbidden`: `{ "code": "ACCOUNT_DEACTIVATED", "message": "Employee account suspended" }`

### 2.2 `POST /auth/logout`
- **Purpose**: Terminate session and invalidate server token/refresh cookie.
- **Auth**: Bearer Token.
- **Success Response (`200 OK`)**: `{ "success": true, "data": null, "message": "Logged out successfully" }`

### 2.3 `GET /auth/me`
- **Purpose**: Retrieve authenticated employee profile and active permissions.
- **Auth**: Bearer Token.
- **Success Response (`200 OK`)**: `{ "success": true, "data": { ...UserObject } }`

---

## 3. Menu & QR Context Endpoints

### 3.1 `GET /menu/context/:token`
- **Purpose**: Resolve table or room context from physical QR token.
- **Auth**: None.
- **Path Parameter**: `token` (String, e.g. `T01`, `301`, or UUID).
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "qr-tbl-01",
      "type": "TABLE",
      "identifier": "T01",
      "displayName": "Table 01",
      "roomOrTableId": "tbl-01",
      "isActive": true,
      "subtext": "Indoor Dining • 4 Seats",
      "hotelId": "hotel-grand-royal"
    }
  }
  ```
- **Error Responses**:
  - `404 Not Found`: `{ "code": "INVALID_QR_TOKEN", "message": "QR token does not exist or has expired" }`
  - `410 Gone`: `{ "code": "QR_DEACTIVATED", "message": "Table station currently inactive" }`

### 3.2 `GET /menu/categories`
- **Purpose**: List active culinary categories.
- **Auth**: None.
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "cat-starters",
        "name": "Appetizers & Starters",
        "description": "Tandoori bites and crisp appetizers",
        "displayOrder": 1,
        "isActive": true
      }
    ]
  }
  ```

### 3.3 `GET /menu/items`
- **Purpose**: Fetch menu catalog with filters and item modifier groups.
- **Auth**: None.
- **Query Parameters**:
  - `categoryId` (optional): Filter by category ID.
  - `search` (optional): Substring search over name and description.
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "item-butter-chicken",
        "name": "Murgh Makhani (Butter Chicken)",
        "description": "Tender chicken cooked in rich makhani gravy",
        "price": 440,
        "categoryId": "cat-mains",
        "isAvailable": true,
        "spiceLevel": "MEDIUM",
        "dietary": "NON_VEG",
        "preparationTimeMinutes": 20,
        "modifierGroups": [
          {
            "id": "mod-portion",
            "name": "Portion Size",
            "required": true,
            "minSelections": 1,
            "maxSelections": 1,
            "options": [
              { "id": "opt-half", "name": "Half Portion", "price": 0 },
              { "id": "opt-full", "name": "Full Portion", "price": 180 }
            ]
          }
        ]
      }
    ]
  }
  ```

### 3.4 `POST /menu/items` / `PATCH /menu/items/:id` / `DELETE /menu/items/:id`
- **Purpose**: Admin CRUD operations over menu catalog.
- **Auth**: Bearer Token. Required Role: `ADMIN` or `SUPER_ADMIN`.
- **WS Event Dispatched**: `MENU_UPDATED`, `ITEM_AVAILABILITY_CHANGED`.

---

## 4. Order Management Endpoints

### 4.1 `POST /orders/validate`
- **Purpose**: Pre-checkout validation. Validates item availability, portion rules, and calculates authoritative taxes/subtotal.
- **Auth**: None (Customer) or Bearer Token (Staff).
- **Request Body**:
  ```json
  {
    "qrToken": "T01",
    "customerName": "Rohan Gupta",
    "customerPhone": "+91 98765 00000",
    "paymentPreference": "PAY_LATER",
    "items": [
      {
        "menuItemId": "item-butter-chicken",
        "quantity": 2,
        "modifierIds": ["opt-full"],
        "specialInstructions": "Less spicy please"
      }
    ]
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "isValid": true,
      "subtotal": 1240,
      "taxAmount": 62,
      "serviceCharge": 62,
      "grandTotal": 1364,
      "itemValidations": [
        {
          "menuItemId": "item-butter-chicken",
          "available": true,
          "currentPrice": 440
        }
      ]
    }
  }
  ```
- **Error Response (`409 Conflict`)**:
  ```json
  {
    "code": "ITEM_OUT_OF_STOCK",
    "message": "Butter Chicken is currently sold out.",
    "details": { "outOfStockItemIds": ["item-butter-chicken"] }
  }
  ```

### 4.2 `POST /orders`
- **Purpose**: Submit order for kitchen fulfillment.
- **Auth**: None (Customer QR) or Bearer Token (Staff POS).
- **Headers**: Supports `Idempotency-Key`.
- **Request Body**: `CreateOrderPayload` (same as validation).
- **Success Response (`201 Created`)**: Returns full `Order` entity with status `CONFIRMED`.
- **Side Effects**:
  - Automatically creates initial KOT record(s).
  - Reserves ingredient stock.
  - Automatically queues thermal KOT print job if printer online.
- **WS Event Dispatched**:
  - `ORDER_CREATED` to topic `restaurant:orders` and `order:<orderId>`
  - `KOT_CREATED` to topic `kitchen:kots`

### 4.3 `GET /orders/:id`
- **Purpose**: Retrieve order detail, live item breakdown, and status timeline.
- **Auth**: None (Customer with valid ID/token) or Staff.
- **Success Response (`200 OK`)**: `{ "success": true, "data": { ...OrderEntity } }`

### 4.4 `GET /orders`
- **Purpose**: Staff order queue with status and type filters.
- **Auth**: Bearer Token (`WAITER`, `CASHIER`, `MANAGER`, `ADMIN`).
- **Query Parameters**: `status`, `qrType` (`TABLE` | `ROOM`), `page`, `limit`.

### 4.5 `PATCH /orders/:id/status`
- **Purpose**: Advance or override order status.
- **Auth**: Bearer Token (`WAITER`, `CAPTAIN`, `MANAGER`, `ADMIN`).
- **Request Body**: `{ "status": "SERVED", "note": "Delivered to Table 01" }`
- **WS Event Dispatched**: `ORDER_STATUS_UPDATED`.

### 4.6 `POST /orders/:id/cancel`
- **Purpose**: Request cancellation of order.
- **Auth**: Public (Within 2-minute placement window prior to cooking) or Staff (`MANAGER`, `ADMIN`).
- **Request Body**: `{ "reason": "Guest changed mind" }`
- **Success Response (`200 OK`)**: Returns updated Order with status `CANCELLED`.
- **Side Effects**:
  - Cancels associated un-started KOTs.
  - Restores reserved ingredient inventory.
- **WS Event Dispatched**: `ORDER_CANCELLED` and `KOT_CANCELLED`.

---

## 5. Kitchen (KDS) Endpoints

### 5.1 `GET /kitchen/kots`
- **Purpose**: Fetch active kitchen tickets for the KDS station.
- **Auth**: Bearer Token (`KITCHEN_STAFF`, `MANAGER`, `ADMIN`).
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "kot-101",
        "orderId": "ord-101",
        "kotNumber": "KOT-0842",
        "tableOrRoom": "Table 01",
        "qrType": "TABLE",
        "status": "ACCEPTED",
        "createdAt": "2026-10-10T14:45:00.000Z",
        "elapsedSeconds": 180,
        "items": [
          {
            "id": "koti-1",
            "name": "Murgh Makhani",
            "quantity": 2,
            "modifiers": ["Full Portion"],
            "specialInstructions": "Less spicy please"
          }
        ]
      }
    ]
  }
  ```

### 5.2 `PATCH /kitchen/kots/:id/status`
- **Purpose**: Progress KOT ticket state on KDS display.
- **Auth**: Bearer Token (`KITCHEN_STAFF`, `MANAGER`).
- **Request Body**:
  ```json
  {
    "status": "PREPARING",
    "note": "Chef starting pan"
  }
  ```
- **Valid Status Transitions**:
  `NEW` -> `ACCEPTED` -> `PREPARING` -> `READY` -> `SERVED`
- **WS Event Dispatched**: `KOT_STATUS_UPDATED`, `ORDER_STATUS_UPDATED`.

---

## 6. Billing & Payment Endpoints

### 6.1 `GET /bills/:id` / `GET /bills/order/:orderId`
- **Purpose**: Fetch finalized tax invoice with itemized tax breakdowns (CGST/SGST).
- **Auth**: Public (Customer bill token) or Staff.
- **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "bill-1042",
      "billNumber": "INV-2026-1042",
      "orderId": "ord-101",
      "status": "ISSUED",
      "subtotal": 1240,
      "discountAmount": 0,
      "cgst": 31,
      "sgst": 31,
      "serviceCharge": 62,
      "grandTotal": 1364,
      "paidAmount": 0,
      "dueAmount": 1364,
      "qrContext": { "type": "TABLE", "identifier": "T01" },
      "items": [ ...SnapshotItems ]
    }
  }
  ```

### 6.2 `POST /bills/order/:orderId/generate`
- **Purpose**: Lock active order and generate formal GST tax invoice bill snapshot.
- **Auth**: Bearer Token (`CASHIER`, `MANAGER`, `WAITER`).

### 6.3 `POST /bills/:id/payments`
- **Purpose**: Settle bill or record payment installment.
- **Auth**: Public or Bearer Token. Supports `Idempotency-Key`.
- **Request Body**:
  ```json
  {
    "billId": "bill-1042",
    "amount": 1364,
    "method": "UPI",
    "transactionReference": "UPI-REF-99281726",
    "notes": "Paid via PhonePe QR"
  }
  ```
- **Success Response (`201 Created`)**: Returns `Payment` record and updated `Bill` status (`PAID`).
- **WS Event Dispatched**: `PAYMENT_RECORDED`, `BILL_UPDATED`.

### 6.4 `POST /payments/:id/refund`
- **Purpose**: Process authorized refund.
- **Auth**: Bearer Token (`MANAGER`, `ADMIN`, `SUPER_ADMIN`).
- **Request Body**: `{ "amount": 1364, "reason": "Customer billing complaint" }`
- **WS Event Dispatched**: `REFUND_PROCESSED`, `BILL_UPDATED`.

---

## 7. Inventory & Stock Endpoints

### 7.1 `GET /inventory/items`
- **Purpose**: List ingredients, current stock levels, and reorder warnings.
- **Auth**: Bearer Token (`ADMIN`, `SUPER_ADMIN`).
- **Query Parameters**: `isLowStock` (Boolean), `search` (String).

### 7.2 `POST /inventory/adjustments`
- **Purpose**: Record inventory movement: restock, usage, wastage, or physical audit adjustment.
- **Auth**: Bearer Token (`ADMIN`, `SUPER_ADMIN`).
- **Request Body**:
  ```json
  {
    "itemId": "inv-chicken-breast",
    "quantityChange": 25.5,
    "reason": "Shipment from Metro Cash & Carry",
    "type": "RESTOCK"
  }
  ```

---

## 8. Hardware Printer Endpoints

### 8.1 `GET /printers`
- **Purpose**: Status of ESC/POS thermal network printers.
- **Auth**: Bearer Token (`ADMIN`, `SUPER_ADMIN`).

### 8.2 `GET /print-jobs` / `POST /print-jobs/:id/retry` / `POST /print-jobs/:id/reprint`
- **Purpose**: Manage physical thermal print queues, retries, and reprints.
- **Auth**: Bearer Token (`ADMIN`, `SUPER_ADMIN`).
- **WS Event Dispatched**: `PRINT_JOB_STATUS`.
