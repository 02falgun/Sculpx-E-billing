# SCULPX E-Billing — REST API Contracts & Endpoint Specification

> **Base URL Convention**: `/api/v1` (Configured via `NEXT_PUBLIC_API_URL`)  
> **Protocol**: HTTPS / JSON (`Content-Type: application/json; charset=utf-8`)  
> **Target Backend**: Node.js (Express / Fastify / Nest) + PostgreSQL 15+  
> **Contract Status**: Exhaustive Specification (Proposed vs Verified Front-to-Back Mapping)  

---

## 1. Global API Architectural Standards

### 1.1 Response Envelope Structure

#### A. Standard Success Envelope (`200 OK`, `201 Created`):
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully",
  "meta": {
    "requestId": "req_01HJ8Z...",
    "timestamp": "2026-10-10T15:30:00.000Z"
  }
}
```

#### B. Paginated Success Envelope:
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
  },
  "meta": {
    "requestId": "req_01HJ8Z..."
  }
}
```

#### C. Error Envelope (`400`, `401`, `403`, `404`, `409`, `422`, `500`):
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
        "issue": "Must be greater than 0",
        "received": 0
      }
    ],
    "timestamp": "2026-10-10T15:30:00.000Z"
  }
}
```

### 1.2 HTTP Status Code Conventions
- `200 OK`: Request succeeded; returns data entity or list.
- `201 Created`: Resource successfully created (e.g. order placed, user created).
- `400 Bad Request`: Malformed JSON or unparseable parameters.
- `401 Unauthorized`: Missing or invalid Bearer authentication token.
- `403 Forbidden`: Authenticated user lacks required role/permission for the resource.
- `404 Not Found`: Entity (order, bill, item, QR token) does not exist.
- `409 Conflict`: Business invariant collision (e.g., item out of stock, concurrent tab modification).
- `422 Unprocessable Entity`: Validation schema failure (e.g. invalid phone number, negative price).
- `500 Internal Server Error`: Unhandled server exception.

### 1.3 Common Conventions & Policies
- **Date/Time Policy**: All dates exchanged over JSON MUST be ISO 8601 strings in UTC (`YYYY-MM-DDTHH:mm:ss.sssZ`).
- **Currency & Money Policy**: Currency is Indian Rupee (`INR`, symbol `₹`). Stored in PostgreSQL as `NUMERIC(10, 2)`. Rounded to 2 decimal places in API outputs.
- **Identifier Format**: UUID v4 strings (e.g. `9f83a21b-8521-4d37-9759-450eb3638f42`) or human-readable prefixes (`ord-1042`, `bill-892`).
- **Idempotency**: Mutating requests (`POST /orders`, `POST /bills/:id/payments`) support the `Idempotency-Key: <UUIDv4>` header.

---

## 2. Master Endpoint Matrix

| # | Endpoint Path | Method | Consuming Screen | Auth Required | Status |
|---|---|---|---|---|---|
| 1 | `/auth/login` | `POST` | `/login` | Public | Verified in Client |
| 2 | `/auth/logout` | `POST` | Staff Nav | Bearer | Verified in Client |
| 3 | `/auth/me` | `GET` | Staff App Layout | Bearer | Verified in Client |
| 4 | `/users` | `GET` | `/admin/users` | Bearer (`ADMIN`) | Verified in Client |
| 5 | `/users` | `POST` | `/admin/users` | Bearer (`ADMIN`) | Verified in Client |
| 6 | `/users/:id/role` | `PATCH` | `/admin/users` | Bearer (`SUPER_ADMIN`) | Verified in Client |
| 7 | `/public/qr-context/:token` | `GET` | `/menu/[qrToken]` | Public | Verified in Client |
| 8 | `/menu/categories` | `GET` | Menu & POS | Public | Verified in Client |
| 9 | `/menu/items` | `GET` | Menu, POS, Admin | Public | Verified in Client |
| 10 | `/menu/items/:id` | `GET` | Item Detail Modal | Public | Verified in Client |
| 11 | `/menu/items` | `POST` | `/admin/menu` | Bearer (`ADMIN`) | Verified in Client |
| 12 | `/menu/items/:id` | `PATCH` | `/admin/menu` | Bearer (`ADMIN`) | Verified in Client |
| 13 | `/menu/items/:id` | `DELETE` | `/admin/menu` | Bearer (`ADMIN`) | Verified in Client |
| 14 | `/orders/validate` | `POST` | `/checkout` | Public | Verified in Client |
| 15 | `/orders` | `POST` | `/checkout`, `/staff/pos` | Public / Staff | Verified in Client |
| 16 | `/orders/:id` | `GET` | `/order/[orderId]` | Public (Token) / Staff | Verified in Client |
| 17 | `/orders` | `GET` | `/orders`, `/staff/orders` | Bearer (`WAITER`+) | Verified in Client |
| 18 | `/orders/:id/status` | `PATCH` | Staff Order Modals | Bearer (`WAITER`+) | Verified in Client |
| 19 | `/orders/:id/cancel` | `POST` | Order Cancel Dialog | Public / Staff | Verified in Client |
| 20 | `/kitchen/kots` | `GET` | `/kitchen` | Bearer (`KITCHEN`+) | Verified in Client |
| 21 | `/kitchen/kots/:id` | `GET` | KOT Detail Drawer | Bearer (`KITCHEN`+) | Verified in Client |
| 22 | `/kitchen/kots/:id/status` | `PATCH` | KDS Action Buttons | Bearer (`KITCHEN`+) | Verified in Client |
| 23 | `/bills/:id` | `GET` | `/bill/[billId]` | Public / Staff | Verified in Client |
| 24 | `/bills/order/:orderId` | `GET` | `/cashier/bills` | Bearer (`CASHIER`+) | Verified in Client |
| 25 | `/bills` | `GET` | `/cashier/bills` | Bearer (`CASHIER`+) | Verified in Client |
| 26 | `/bills/order/:orderId/generate` | `POST` | Cashier Bill Drawer | Bearer (`CASHIER`+) | Verified in Client |
| 27 | `/bills/:id/discount` | `POST` | Cashier Discount Modal| Bearer (`CASHIER`+) | Verified in Client |
| 28 | `/bills/:id/void` | `POST` | Manager Void Modal | Bearer (`MANAGER`+) | Verified in Client |
| 29 | `/bills/:id/payments` | `POST` | Cashier / Customer Pay| Public / Cashier | Verified in Client |
| 30 | `/payments/:id/refund` | `POST` | Cashier Ledger | Bearer (`MANAGER`+) | Verified in Client |
| 31 | `/inventory/items` | `GET` | `/admin/inventory` | Bearer (`ADMIN`+) | Verified in Client |
| 32 | `/inventory/adjustments` | `POST` | Inventory Modal | Bearer (`ADMIN`+) | Verified in Client |
| 33 | `/inventory/transactions` | `GET` | `/admin/inventory/transactions` | Bearer (`ADMIN`+) | Verified in Client |
| 34 | `/inventory/recipes` | `GET` | `/admin/inventory/recipes` | Bearer (`ADMIN`+) | Verified in Client |
| 35 | `/printers` | `GET` | `/admin/printers` | Bearer (`ADMIN`+) | Verified in Client |
| 36 | `/print-jobs` | `GET` | `/admin/print-jobs` | Bearer (`ADMIN`+) | Verified in Client |
| 37 | `/print-jobs/:id/retry` | `POST` | Print Job Drawer | Bearer (`ADMIN`+) | Verified in Client |
| 38 | `/tables` | `GET` | `/tables`, `/staff/tables` | Bearer (`WAITER`+) | Verified in Client |
| 39 | `/tables/:id/status` | `PATCH` | Table Grid Action | Bearer (`WAITER`+) | Verified in Client |
| 40 | `/rooms` | `GET` | `/admin/rooms` | Bearer (`WAITER`+) | Verified in Client |
| 41 | `/rooms/:id/status` | `PATCH` | Room Grid Action | Bearer (`WAITER`+) | Verified in Client |
| 42 | `/reports/sales` | `GET` | `/admin/reports` | Bearer (`ADMIN`) | Proposed — Stage 6 |
| 43 | `/reports/performance` | `GET` | `/manager/reports` | Bearer (`MANAGER`+) | Proposed — Stage 6 |

---

## 3. Detailed Endpoint Contracts

### 3.1 Authentication

#### `POST /api/v1/auth/login`
- **Purpose**: Authenticate staff employee.
- **Auth**: None.
- **Request Body**:
  ```json
  {
    "email": "waiter@demo.com",
    "pinOrPassword": "password123"
  }
  ```
- **Success (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "usr-waiter-1",
        "name": "Amit Kumar",
        "email": "waiter@demo.com",
        "role": "WAITER",
        "phoneNumber": "+91 98765 43211",
        "isActive": true,
        "permissions": ["view_tables", "create_orders", "pos_access"]
      },
      "token": "eyJhbGciOiJIUzI1NiIsIn...",
      "expiresAt": "2026-10-11T15:00:00.000Z"
    }
  }
  ```
- **Errors**: `401 INVALID_CREDENTIALS`, `403 ACCOUNT_DISABLED`.

---

### 3.2 Menu & QR Ordering

#### `GET /api/v1/public/qr-context/:token`
- **Purpose**: Resolve table or room context from QR token.
- **Auth**: None.
- **Success (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "qr-tbl-01",
      "type": "TABLE",
      "identifier": "Table 01",
      "roomOrTableId": "tbl-01",
      "isActive": true,
      "subtext": "Royal Courtyard • 4 Seats"
    }
  }
  ```

#### `POST /api/v1/orders/validate`
- **Purpose**: Pre-checkout cart verification. Recalculates authoritative taxes and detects 86'd items.
- **Auth**: None (Customer) or Bearer (Staff).
- **Request Body**:
  ```json
  {
    "qrToken": "tbl-01",
    "items": [
      {
        "menuItemId": "item-butter-chicken",
        "quantity": 2,
        "modifierIds": ["mod-full-portion"],
        "specialInstructions": "Less spicy"
      }
    ]
  }
  ```
- **Success (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "isValid": true,
      "unavailableItems": [],
      "priceDiscrepancies": [],
      "calculatedSubtotal": 880.00,
      "calculatedTax": 44.00,
      "calculatedGrandTotal": 924.00
    }
  }
  ```

#### `POST /api/v1/orders`
- **Purpose**: Submit order to kitchen.
- **Headers**: `Idempotency-Key: <uuidv4>`
- **Request Body**:
  ```json
  {
    "qrToken": "tbl-01",
    "customerName": "Rohan Gupta",
    "customerPhone": "+91 98765 43210",
    "paymentPreference": "PAY_LATER",
    "source": "CUSTOMER_QR",
    "items": [
      {
        "menuItemId": "item-butter-chicken",
        "quantity": 2,
        "modifierIds": ["mod-full-portion"]
      }
    ]
  }
  ```
- **Success (`201 Created`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "ord-1042",
      "orderNumber": "ORD-1042",
      "status": "PLACED",
      "grandTotal": 924.00,
      "createdAt": "2026-10-10T15:30:00.000Z"
    }
  }
  ```

---

### 3.3 Kitchen & KDS

#### `PATCH /api/v1/kitchen/kots/:id/status`
- **Purpose**: Update kitchen preparation state.
- **Auth**: Bearer (`KITCHEN_STAFF`, `MANAGER`).
- **Request Body**:
  ```json
  {
    "status": "PREPARING",
    "note": "Started by Chef Sanjeev"
  }
  ```
- **Success (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "kot-0819",
      "status": "PREPARING",
      "acceptedAt": "2026-10-10T15:35:00.000Z"
    }
  }
  ```

---

### 3.4 Billing Desk & Payments

#### `POST /api/v1/bills/order/:orderId/generate`
- **Purpose**: Generate tax invoice for completed dining order.
- **Auth**: Bearer (`CASHIER`, `MANAGER`).
- **Success (`201 Created`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "bill-2026-0419",
      "billNumber": "INV-2026-0419",
      "orderId": "ord-1042",
      "status": "ISSUED",
      "subtotal": 880.00,
      "taxes": [
        { "name": "CGST (2.5%)", "ratePercentage": 2.5, "amount": 22.00 },
        { "name": "SGST (2.5%)", "ratePercentage": 2.5, "amount": 22.00 }
      ],
      "totalTax": 44.00,
      "grandTotal": 924.00,
      "dueAmount": 924.00
    }
  }
  ```

#### `POST /api/v1/bills/:id/payments`
- **Purpose**: Record settlement against open bill.
- **Request Body**:
  ```json
  {
    "billId": "bill-2026-0419",
    "amount": 924.00,
    "method": "UPI",
    "transactionReference": "UPI-TXN-981240182"
  }
  ```
- **Success (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "pay-9021",
      "billId": "bill-2026-0419",
      "amount": 924.00,
      "status": "SUCCESS",
      "method": "UPI"
    }
  }
  ```

---

### 3.5 Inventory & Hardware

#### `POST /api/v1/inventory/adjustments`
- **Purpose**: Record stock movement (restock, usage, wastage).
- **Auth**: Bearer (`ADMIN`, `MANAGER`).
- **Request Body**:
  ```json
  {
    "itemId": "inv-041",
    "quantityChange": -1.5,
    "type": "USAGE",
    "reason": "Used in banquet banquet dinner",
    "referenceOrderId": "ord-1042"
  }
  ```

#### `POST /api/v1/print-jobs/:id/retry`
- **Purpose**: Re-spool failed print job.
- **Auth**: Bearer (`CASHIER`, `ADMIN`).
- **Success (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "job-1092",
      "status": "PROCESSING",
      "retryCount": 2
    }
  }
  ```
