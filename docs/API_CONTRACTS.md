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
| 1 | `/auth/login` | `POST` | `/login` | Public | **Verified (Backend + Mock)** |
| 2 | `/auth/logout` | `POST` | Staff Nav | Bearer | **Verified (Backend + Mock)** |
| 3 | `/auth/me` | `GET` | Staff App Layout | Bearer | **Verified (Backend + Mock)** |
| 4 | `/users` | `GET` | `/admin/users` | Bearer (`ADMIN`) | Verified in Client |
| 5 | `/users` | `POST` | `/admin/users` | Bearer (`ADMIN`) | Verified in Client |
| 6 | `/users/:id/role` | `PATCH` | `/admin/users` | Bearer (`SUPER_ADMIN`) | Verified in Client |
| 7 | `/public/qr-context/:token` | `GET` | `/menu/[qrToken]` | Public | **Verified (Backend + Mock)** |
| 8 | `/menu/categories` | `GET` | Menu & POS | Bearer (Staff) | **Verified (Backend + Mock)** |
| 9 | `/menu/categories/:id` | `GET` | Category Detail | Bearer (Staff) | **Verified (Backend)** |
| 10 | `/menu/categories` | `POST` | `/admin/menu` | Bearer (`ADMIN`) | **Verified (Backend)** |
| 11 | `/menu/categories/:id` | `PATCH` | `/admin/menu` | Bearer (`ADMIN`) | **Verified (Backend)** |
| 12 | `/menu/categories/:id` | `DELETE` | `/admin/menu` | Bearer (`ADMIN`) | **Verified (Backend)** |
| 13 | `/menu/items` | `GET` | Menu, POS, Admin | Bearer (Staff) | **Verified (Backend + Mock)** |
| 14 | `/menu/items/:id` | `GET` | Item Detail Modal | Bearer (Staff) | **Verified (Backend + Mock)** |
| 15 | `/menu/items` | `POST` | `/admin/menu` | Bearer (`ADMIN`) | **Verified (Backend)** |
| 16 | `/menu/items/:id` | `PATCH` | `/admin/menu` | Bearer (`ADMIN`) | **Verified (Backend)** |
| 17 | `/menu/items/:id` | `DELETE` | `/admin/menu` | Bearer (`ADMIN`) | **Verified (Backend)** |
| 18 | `/menu/items/:id/modifier-groups` | `POST` | `/admin/menu` | Bearer (`ADMIN`) | **Verified (Backend)** |
| 19 | `/menu/modifier-groups/:id` | `PATCH`, `DELETE` | `/admin/menu` | Bearer (`ADMIN`) | **Verified (Backend)** |
| 20 | `/menu/modifier-groups/:id/options` | `POST` | `/admin/menu` | Bearer (`ADMIN`) | **Verified (Backend)** |
| 21 | `/menu/modifier-options/:id` | `PATCH`, `DELETE` | `/admin/menu` | Bearer (`ADMIN`) | **Verified (Backend)** |
| 14 | `/orders/validate` | `POST` | `/checkout` | Public | **Verified (Backend + Client)** |
| 15 | `/orders` | `POST` | `/checkout`, `/staff/pos` | Public / Staff | **Verified (Backend + Client Phase 3B.4)** |
| 16 | `/orders/:id` | `GET` | `/order/[orderId]` | Public (Token) / Staff | **Verified (Backend + Client)** |
| 17 | `/orders` | `GET` | `/orders`, `/staff/orders` | Bearer (`WAITER`+) | **Verified (Backend + Client)** |
| 18 | `/orders/:id/status` | `PATCH` | Staff Order Modals | Bearer (`WAITER`+) | Verified in Client |
| 19 | `/orders/:id/cancel` | `POST` | Order Cancel Dialog | Public / Staff | Verified in Client |
| 20 | `/kitchen/kots` | `GET` | `/kitchen` | Bearer (`KITCHEN`+) | **Verified (Backend + Client Phase 3C)** |
| 21 | `/kitchen/kots/:id` | `GET` | KOT Detail Drawer | Bearer (`KITCHEN`+) | **Verified (Backend + Client Phase 3C)** |
| 22 | `/kitchen/kots/:id/status` | `PATCH` | KDS Action Buttons | Bearer (`KITCHEN`+) | **Verified (Backend + Client Phase 3C)** |
| 23 | `/bills/:id` | `GET` | `/bill/[billId]` | Public / Staff | **Verified (Backend + Mock Phase 4)** |
| 24 | `/bills/order/:orderId` | `GET` | `/cashier/bills` | Bearer (`CASHIER`+) | **Verified (Backend + Mock Phase 4)** |
| 25 | `/bills` | `GET` | `/cashier/bills` | Bearer (`CASHIER`+) | **Verified (Backend + Mock Phase 4)** |
| 26 | `/bills/order/:orderId/generate` | `POST` | Cashier Bill Drawer | Bearer (`CASHIER`+) | **Verified (Backend + Mock Phase 4)** |
| 27 | `/bills/:id/discount` | `POST` | Cashier Discount Modal| Bearer (`MANAGER`+) | **Verified (Backend + Mock Phase 4)** |
| 28 | `/bills/:id/void` | `POST` | Manager Void Modal | Bearer (`MANAGER`+) | **Verified (Backend + Mock Phase 4)** |
| 29 | `/bills/:id/payments` | `POST` | Cashier / Customer Pay| Public / Cashier | **Verified (Backend + Mock Phase 4)** |
| 30 | `/payments/:id/refund` | `POST` | Cashier Ledger | Bearer (`MANAGER`+) | Verified in Client |
| 31 | `/inventory/items` | `GET` | `/admin/inventory` | Bearer (`ADMIN`, `MANAGER`) | **Verified (Backend Phase 5 + Client)** |
| 32 | `/inventory/adjustments` | `POST` | Inventory Modal | Bearer (`ADMIN`, `MANAGER`) | **Verified (Backend Phase 5 + Client)** |
| 33 | `/inventory/transactions` | `GET` | `/admin/inventory/transactions` | Bearer (`ADMIN`, `MANAGER`) | **Verified (Backend Phase 5 + Client)** |
| 34 | `/inventory/recipes` | `GET` | `/admin/inventory/recipes` | Bearer (`ADMIN`, `MANAGER`) | **Verified (Backend Phase 5 + Client)** |
| 35 | `/printers` | `GET` | `/admin/printers` | Bearer (`ADMIN`, `MANAGER`, `CASHIER`) | **Verified (Backend Phase 6 + Client)** |
| 36 | `/print-jobs` | `GET` | `/admin/print-jobs` | Bearer (`ADMIN`, `MANAGER`, `CASHIER`) | **Verified (Backend Phase 6 + Client)** |
| 37 | `/print-jobs/:id/retry` | `POST` | Print Job Drawer | Bearer (`ADMIN`, `MANAGER`, `CASHIER`) | **Verified (Backend Phase 6 + Client)** |
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
- **Purpose**: Authenticate staff employee via email and password (or `pinOrPassword`).
- **Auth**: None (Public, Rate-Limited).
- **Request Body**:
  ```json
  {
    "email": "waiter@demo.com",
    "password": "demo-secure-pass" // or "pinOrPassword": "demo-secure-pass"
  }
  ```
- **Success (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "id": "e1b1d1f0-...",
        "tenantId": "e1b1d1f0-0000-4000-8000-000000000001",
        "name": "Rahul Sharma",
        "email": "waiter@demo.com",
        "role": "WAITER",
        "phoneNumber": "+91 98765 43211",
        "isActive": true,
        "permissions": ["view_tables", "create_orders", "pos_access", "request_bill"],
        "createdAt": "2026-10-10T19:26:09.000Z",
        "updatedAt": "2026-10-10T19:26:09.000Z"
      },
      "token": "eyJhbGciOiJIUzI1NiIsIn...",
      "expiresAt": "2026-10-11T03:26:09.000Z"
    },
    "message": "Login successful",
    "meta": {
      "requestId": "uuid",
      "timestamp": "2026-10-10T19:26:09.000Z",
      "serverVersion": "1.0.0"
    }
  }
  ```
- **Errors**:
  - `400 VALIDATION_FAILED`: Malformed email or missing password.
  - `401 INVALID_CREDENTIALS`: Generic credential failure (email not found or wrong password; no email enumeration).
  - `403 ACCOUNT_DISABLED`: Staff account exists but is deactivated.
  - `429 RATE_LIMIT_EXCEEDED`: Rapid login attempts blocked by rate limiter.

#### `GET /api/v1/auth/me`
- **Purpose**: Retrieve currently authenticated employee profile and permissions from DB.
- **Auth**: `Bearer <token>` in `Authorization` header.
- **Success (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "e1b1d1f0-...",
      "tenantId": "e1b1d1f0-0000-4000-8000-000000000001",
      "name": "Rahul Sharma",
      "email": "waiter@demo.com",
      "role": "WAITER",
      "phoneNumber": "+91 98765 43211",
      "isActive": true,
      "permissions": ["view_tables", "create_orders", "pos_access"]
    },
    "meta": {
      "requestId": "uuid",
      "timestamp": "2026-10-10T19:26:09.000Z",
      "serverVersion": "1.0.0"
    }
  }
  ```
- **Errors**:
  - `401 UNAUTHORIZED`: Missing, forged, or expired Bearer token.
  - `403 ACCOUNT_DISABLED`: User was disabled in DB after token issuance.

#### `POST /api/v1/auth/logout`
- **Purpose**: Terminate session.
- **Auth**: `Bearer <token>` in `Authorization` header.
- **Success (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": null,
    "message": "Logged out successfully"
  }
  ```

### 3.2 Menu Catalog

#### Categories

##### `GET /api/v1/menu/categories`
- **Purpose**: List menu categories for the current tenant.
- **Auth**: Bearer token (Any authenticated staff role: `WAITER`, `CASHIER`, `KITCHEN_STAFF`, `CAPTAIN`, `MANAGER`, `ADMIN`, `SUPER_ADMIN`).
- **Query Parameters**:
  - `includeInactive`: boolean (optional, defaults to `false`)
- **Success (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "073fc4c7-1c61-4c64-ae4a-9f36aa81828c",
        "tenantId": "e1b1d1f0-0000-4000-8000-000000000001",
        "name": "Tandoor & Starters",
        "slug": "tandoor-and-starters",
        "description": "Clay oven grilled delicacies",
        "displayOrder": 1,
        "isActive": true,
        "itemCount": 8,
        "createdAt": "2026-10-10T19:26:09.000Z",
        "updatedAt": "2026-10-10T19:26:09.000Z"
      }
    ]
  }
  ```

##### `GET /api/v1/menu/categories/:id`
- **Purpose**: Get category details by ID.
- **Auth**: Bearer token (Any staff role).
- **Errors**: `404 CATEGORY_NOT_FOUND` if category does not exist or belongs to another tenant.

##### `POST /api/v1/menu/categories`
- **Purpose**: Create a new menu category.
- **Auth**: Bearer (`ADMIN`, `SUPER_ADMIN`).
- **Request Body**:
  ```json
  {
    "name": "Breads & Naan",
    "description": "Fresh tandoor-baked breads",
    "displayOrder": 3,
    "isActive": true
  }
  ```
- **Success (`201 Created`)**: Returns created category with autogenerated or sanitized slug.
- **Errors**: `400 VALIDATION_FAILED` (missing name, string length out of bounds).

##### `PATCH /api/v1/menu/categories/:id`
- **Purpose**: Update an existing menu category.
- **Auth**: Bearer (`ADMIN`, `SUPER_ADMIN`).
- **Request Body**: Partial category object (`name`, `description`, `displayOrder`, `isActive`).
- **Success (`200 OK`)**: Returns updated category.
- **Errors**: `404 CATEGORY_NOT_FOUND`.

##### `DELETE /api/v1/menu/categories/:id`
- **Purpose**: Delete a category. If items exist under the category, it performs a safe soft-deactivation (`isActive = false`) to avoid violating relational constraints.
- **Auth**: Bearer (`ADMIN`, `SUPER_ADMIN`).
- **Success (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "...",
      "deleted": true, // or false if soft-deactivated
      "deactivated": false // or true if soft-deactivated
    },
    "message": "Menu category removed successfully"
  }
  ```

---

#### Menu Items

##### `GET /api/v1/menu/items`
- **Purpose**: Retrieve menu items with pagination and filters.
- **Auth**: Bearer token (Any staff role).
- **Query Parameters**:
  - `page`: integer (default `1`)
  - `limit`: integer (default `20`, max `100`)
  - `categoryId`: UUID (optional)
  - `dietaryType`: `VEG` | `NON_VEG` | `VEGAN` | `EGG` (optional)
  - `isAvailable`: boolean (optional)
  - `search`: string (optional, searches name/description)
- **Success (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "1fa615b5-a628-4874-ad5c-0463900e86da",
          "categoryId": "073fc4c7-1c61-4c64-ae4a-9f36aa81828c",
          "name": "Butter Chicken",
          "description": "Slow cooked chicken in rich makhani gravy",
          "price": 440.00,
          "taxRate": 5.00,
          "dietaryType": "NON_VEG",
          "spiceLevel": "MEDIUM",
          "prepTimeMinutes": 20,
          "isAvailable": true,
          "tags": ["Chef Special", "Bestseller"],
          "category": {
            "id": "073fc4c7-1c61-4c64-ae4a-9f36aa81828c",
            "name": "Main Course",
            "slug": "main-course"
          },
          "modifierGroups": [
            {
              "id": "mod-group-1",
              "name": "Portion Size",
              "minSelections": 1,
              "maxSelections": 1,
              "isRequired": true,
              "options": [
                {
                  "id": "mod-opt-1",
                  "name": "Half Portion",
                  "price": 0.00,
                  "isAvailable": true
                },
                {
                  "id": "mod-opt-2",
                  "name": "Full Portion",
                  "price": 180.00,
                  "isAvailable": true
                }
              ]
            }
          ]
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "totalItems": 42,
        "totalPages": 3,
        "hasNextPage": true,
        "hasPrevPage": false
      }
    }
  }
  ```

##### `GET /api/v1/menu/items/:id`
- **Purpose**: Get menu item details by ID including complete modifier groups and options hierarchy.
- **Auth**: Bearer token (Any staff role).
- **Errors**: `404 ITEM_NOT_FOUND`.

##### `POST /api/v1/menu/items`
- **Purpose**: Create a new menu item with authoritative decimal pricing and optional nested modifier groups.
- **Auth**: Bearer (`ADMIN`, `SUPER_ADMIN`).
- **Request Body**:
  ```json
  {
    "categoryId": "073fc4c7-1c61-4c64-ae4a-9f36aa81828c",
    "name": "Amritsari Soya Chaap",
    "description": "Clay-oven roasted soya chunks",
    "price": 280.00,
    "taxRate": 5.00,
    "dietaryType": "VEG",
    "spiceLevel": "MEDIUM",
    "prepTimeMinutes": 15,
    "isAvailable": true,
    "tags": ["Tandoor", "Must Try"],
    "modifierGroups": [
      {
        "name": "Dip Selection",
        "minSelections": 0,
        "maxSelections": 2,
        "isRequired": false,
        "options": [
          { "name": "Mint Chutney", "price": 0.00, "isAvailable": true },
          { "name": "Garlic Mayo", "price": 30.00, "isAvailable": true }
        ]
      }
    ]
  }
  ```
- **Success (`201 Created`)**: Returns full item structure with IDs and serialized prices.
- **Errors**:
  - `400 VALIDATION_FAILED` (negative price, missing categoryId, invalid dietaryType).
  - `400 INVALID_CATEGORY` (category does not exist or belongs to another tenant).

##### `PATCH /api/v1/menu/items/:id`
- **Purpose**: Update menu item details, prices, availability, or category assignment.
- **Auth**: Bearer (`ADMIN`, `SUPER_ADMIN`).
- **Request Body**: Partial menu item object.
- **Success (`200 OK`)**: Returns updated item.
- **Errors**: `404 ITEM_NOT_FOUND`, `400 INVALID_CATEGORY`.

##### `DELETE /api/v1/menu/items/:id`
- **Purpose**: Delete menu item. If referenced by historical order items or bills, soft-deactivates (`isAvailable = false`) to preserve audit trail.
- **Auth**: Bearer (`ADMIN`, `SUPER_ADMIN`).
- **Success (`200 OK`)**: Returns `{ "deleted": boolean, "deactivated": boolean }`.

---

#### Modifier Groups & Options Management

##### `POST /api/v1/menu/items/:itemId/modifier-groups`
- **Purpose**: Attach a new modifier group to an item.
- **Auth**: Bearer (`ADMIN`, `SUPER_ADMIN`).
- **Request Body**: `{ "name": "Crust", "minSelections": 1, "maxSelections": 1, "isRequired": true }`.
- **Success (`201 Created`)**: Returns modifier group.

##### `PATCH /api/v1/menu/modifier-groups/:groupId`
- **Purpose**: Update modifier group settings.
- **Auth**: Bearer (`ADMIN`, `SUPER_ADMIN`).

##### `DELETE /api/v1/menu/modifier-groups/:groupId`
- **Purpose**: Delete a modifier group and its child options.
- **Auth**: Bearer (`ADMIN`, `SUPER_ADMIN`).

##### `POST /api/v1/menu/modifier-groups/:groupId/options`
- **Purpose**: Add a new option to a modifier group.
- **Auth**: Bearer (`ADMIN`, `SUPER_ADMIN`).
- **Request Body**: `{ "name": "Cheese Burst", "price": 80.00, "isAvailable": true }`.
- **Success (`201 Created`)**: Returns created option with authoritative decimal price.

##### `PATCH /api/v1/menu/modifier-options/:optionId`
- **Purpose**: Update modifier option name, price, or availability.
- **Auth**: Bearer (`ADMIN`, `SUPER_ADMIN`).

##### `DELETE /api/v1/menu/modifier-options/:optionId`
- **Purpose**: Remove a modifier option.
- **Auth**: Bearer (`ADMIN`, `SUPER_ADMIN`).

---

### 3.3 QR Context & Validation

#### `GET /api/v1/public/qr-context/:token`
- **Purpose**: Resolve table or room context from an untrusted physical QR token for customer digital menu access without staff authentication.
- **Auth**: Public (No JWT required).
- **Rate Limit**: 30 requests per minute per IP (`@fastify/rate-limit`).
- **Path Parameters**:
  - `token`: string (min 3, max 100 characters, alphanumeric with hyphens/underscores).
- **Security Guarantees**:
  - Raw QR tokens are never logged.
  - Zero leakage of internal `tenantId`, staff info, room `guestName`, or `folioId`.
  - Rejects cross-tenant mismatches with generic `404 QR_INVALID_ASSIGNMENT`.
  - Automatically updates `lastScannedAt` timestamp in background.
- **Success (`200 OK`) — Table Context**:
  ```json
  {
    "success": true,
    "data": {
      "id": "qr-tbl-1",
      "token": "table-token-1",
      "type": "TABLE",
      "identifier": "1",
      "displayName": "Table 1",
      "roomOrTableId": "tbl-01-uuid",
      "tableId": "tbl-01-uuid",
      "locationDetails": {
        "section": "Indoor Garden",
        "capacity": 4
      },
      "subtext": "Indoor Garden • 4 Seats",
      "isActive": true,
      "status": "VACANT"
    },
    "meta": {
      "requestId": "uuid",
      "timestamp": "2026-10-10T19:50:00.000Z",
      "serverVersion": "1.0.0"
    }
  }
  ```
- **Success (`200 OK`) — Room Context**:
  ```json
  {
    "success": true,
    "data": {
      "id": "qr-room-301",
      "token": "room-token-301",
      "type": "ROOM",
      "identifier": "301",
      "displayName": "Room 301",
      "roomOrTableId": "room-01-uuid",
      "roomId": "room-01-uuid",
      "locationDetails": {
        "floor": "3rd Floor"
      },
      "subtext": "3rd Floor",
      "isActive": true,
      "status": "OCCUPIED"
    },
    "meta": {
      "requestId": "uuid",
      "timestamp": "2026-10-10T19:50:00.000Z",
      "serverVersion": "1.0.0"
    }
  }
  ```
- **Errors**:
  - `400 VALIDATION_FAILED`: Malformed token format or invalid characters.
  - `400 QR_INACTIVE`: QR code exists but is deactivated (`is_active = false`).
  - `404 QR_NOT_FOUND`: Token does not exist in the database.
  - `404 QR_INVALID_ASSIGNMENT`: Target table/room is missing, ambiguous, or belongs to a different tenant.
  - `429 RATE_LIMIT_EXCEEDED`: Scan frequency exceeds rate limit threshold.

#### `POST /api/v1/orders/validate`
- **Aliases**: `/api/orders/validate`
- **Purpose**: Pre-checkout cart verification and authoritative server-side price computation. Resolves customer's QR context, validates menu items and modifiers against PostgreSQL snapshot, enforces group selection cardinality, verifies availability (86'd detection), and calculates checkout-ready price and Indian GST breakdown without writing any database records.
- **Auth**: None (Customer QR guest checkout; no staff JWT required).
- **Rate Limit**: 60 requests/minute per IP.
- **Request Body**:
  ```json
  {
    "qrToken": "tbl-terrace-1",
    "items": [
      {
        "menuItemId": "c2000000-0000-0000-0000-000000000001",
        "quantity": 2,
        "modifierOptionIds": ["d1000000-0000-0000-0000-000000000002", "d2000000-0000-0000-0000-000000000001"],
        "clientPrice": 600.00,
        "specialInstructions": "Less spicy please"
      }
    ]
  }
  ```
  *(Note: `modifierIds` is also accepted as a backward-compatible alias for `modifierOptionIds`)*.
- **Success (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "isValid": true,
      "context": {
        "type": "TABLE",
        "identifier": "T-01",
        "displayName": "Terrace Table 1"
      },
      "items": [
        {
          "menuItemId": "c2000000-0000-0000-0000-000000000001",
          "name": "Makhani Butter Chicken",
          "quantity": 2,
          "unitBasePrice": 400.00,
          "modifiersSubtotal": 200.00,
          "unitPrice": 600.00,
          "lineSubtotal": 1200.00,
          "taxRate": 5.00,
          "taxAmount": 60.00,
          "lineTotal": 1260.00,
          "modifiers": [
            {
              "id": "d1000000-0000-0000-0000-000000000002",
              "name": "Full Portion",
              "price": 150.00,
              "groupName": "Portion Size"
            },
            {
              "id": "d2000000-0000-0000-0000-000000000001",
              "name": "Extra Gravy",
              "price": 50.00,
              "groupName": "Addons"
            }
          ],
          "specialInstructions": "Less spicy please"
        }
      ],
      "pricing": {
        "itemsSubtotal": 800.00,
        "modifiersSubtotal": 400.00,
        "taxableSubtotal": 1200.00,
        "taxes": [
          {
            "name": "CGST",
            "rate": 2.50,
            "amount": 30.00
          },
          {
            "name": "SGST",
            "rate": 2.50,
            "amount": 30.00
          }
        ],
        "totalTax": 60.00,
        "finalTotal": 1260.00,
        "currency": "INR"
      },
      "unavailableItems": [],
      "priceDiscrepancies": [],
      "warnings": [],
      "calculatedSubtotal": 1200.00,
      "calculatedTax": 60.00,
      "calculatedGrandTotal": 1260.00
    }
  }
  ```
- **Error Codes**:
  - `400 VALIDATION_FAILED`: Malformed payload, invalid UUIDs, empty items array, negative or zero quantities.
  - `400 QR_INACTIVE`: QR code exists but is marked inactive/disabled.
  - `404 QR_NOT_FOUND`: QR token does not exist in the database.
  - `404 QR_INVALID_ASSIGNMENT`: QR record has unassigned, ambiguous, or mismatched table/room data.
  - `429 RATE_LIMIT_EXCEEDED`: Validation request rate limit exceeded.

#### `POST /api/v1/orders`
- **Aliases**: `/api/orders`
- **Status**: **Verified & Implemented (Backend Phase 3B.3)**
- **Purpose**: Atomically persist a dining customer order from a validated QR context, calculate authoritative PostgreSQL pricing and GST, generate initial KOT tickets, persist durable idempotency records, and queue transactional outbox events.
- **Auth**: Public for valid guest QR context; optional `Bearer <token>` for staff roles (`WAITER`, `CAPTAIN`, `MANAGER`, `ADMIN`).
- **Headers**:
  - `Idempotency-Key`: string (optional, UUID v4 or up to 255 chars). Protects against duplicate order creation and concurrent network submission retries.
  - `Authorization`: `Bearer <token>` (optional).
- **Request Body**:
  ```json
  {
    "qrToken": "tbl-01",
    "customerName": "Rohan Gupta",
    "customerPhone": "+91 98765 43210",
    "specialInstructions": "Less spicy please",
    "paymentPreference": "PAY_LATER",
    "source": "CUSTOMER_QR",
    "items": [
      {
        "menuItemId": "073fc4c7-1c61-4c64-ae4a-9f36aa81828c",
        "quantity": 2,
        "modifierOptionIds": ["5c8986a1-949d-4786-9a25-e01fe1f67f01"],
        "specialInstructions": "Fresh coriander on top"
      }
    ]
  }
  ```
- **Success (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "Order placed successfully",
    "data": {
      "id": "c71be39c-48c9-4b61-9c88-66170dcb7684",
      "orderNumber": "ORD-20261011-0001",
      "status": "CONFIRMED",
      "source": "CUSTOMER_QR",
      "paymentPreference": "PAY_LATER",
      "subtotal": 1200.00,
      "taxTotal": 60.00,
      "serviceCharge": 0.00,
      "grandTotal": 1260.00,
      "customerName": "Rohan Gupta",
      "customerPhone": "+91 98765 43210",
      "specialInstructions": "Less spicy please",
      "diningContext": {
        "type": "TABLE",
        "identifier": "T-01",
        "displayName": "Table 01",
        "roomOrTableId": "f1a2b3c4-..."
      },
      "items": [
        {
          "id": "e4b2a1c0-...",
          "menuItemId": "073fc4c7-1c61-4c64-ae4a-9f36aa81828c",
          "itemName": "Butter Chicken Special",
          "quantity": 2,
          "unitPrice": 600.00,
          "totalPrice": 1200.00,
          "taxAmount": 60.00,
          "modifiers": [
            {
              "id": "5c8986a1-...",
              "name": "Full Portion",
              "price": 150.00,
              "groupName": "Portion"
            }
          ],
          "specialInstructions": "Fresh coriander on top",
          "status": "PLACED"
        }
      ],
      "assignedKotIds": ["a9c8b7d6-..."],
      "kots": [
        {
          "id": "a9c8b7d6-...",
          "kotNumber": "KOT-20261011-0001",
          "status": "NEW",
          "station": "Main Kitchen",
          "itemCount": 1,
          "createdAt": "2026-10-11T02:00:00.000Z"
        }
      ],
      "createdAt": "2026-10-11T02:00:00.000Z",
      "updatedAt": "2026-10-11T02:00:00.000Z",
      "order": {
        "id": "c71be39c-48c9-4b61-9c88-66170dcb7684",
        "orderNumber": "ORD-20261011-0001",
        "status": "CONFIRMED",
        "source": "CUSTOMER_QR",
        "paymentPreference": "PAY_LATER",
        "subtotal": 1200.00,
        "taxTotal": 60.00,
        "grandTotal": 1260.00,
        "items": [...],
        "createdAt": "2026-10-11T02:00:00.000Z"
      }
    },
    "meta": {
      "requestId": "9c1b...",
      "timestamp": "2026-10-11T02:00:00.000Z",
      "serverVersion": "1.0.0"
    }
  }
  ```
- **Error Codes**:
  - `400 VALIDATION_FAILED`: Malformed payload, invalid UUIDs, empty items array, zero or negative quantities.
  - `400 QR_INACTIVE`: QR code exists but is disabled.
  - `404 QR_NOT_FOUND`: QR token does not exist in PostgreSQL.
  - `409 ITEM_UNAVAILABLE`: Item 86'd, sold-out modifier, cross-tenant item mismatch, or modifier selection cardinality rule violation.
  - `409 IDEMPOTENCY_CONFLICT`: Idempotency key was previously submitted with a different request body fingerprint.
  - `409 IDEMPOTENCY_IN_PROGRESS`: Concurrent request with identical idempotency key currently in flight.
  - `429 RATE_LIMIT_EXCEEDED`: Order creation rate limit exceeded (30 req/min).

---

### 3.3 Kitchen & KDS

#### `GET /api/v1/kitchen/kots`
- **Aliases**: `/api/kitchen/kots`
- **Status**: **Verified & Implemented (Backend + Client Phase 3C)**
- **Purpose**: Retrieve active kitchen order tickets (excluding SERVED and CANCELLED) for the kitchen display board.
- **Auth**: Bearer (`KITCHEN_STAFF`, `MANAGER`, `ADMIN`, `SUPER_ADMIN`).
- **Query Parameters**:
  - `station`: string (optional, e.g. "Main Kitchen")
- **Success (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "c71be39c-48c9-4b61-9c88-66170dcb7684",
        "kotNumber": "KOT-20261011-0001",
        "orderId": "b1a2c3d4-...",
        "orderNumber": "ORD-20261011-0001",
        "status": "ACCEPTED",
        "station": "Main Kitchen",
        "urgency": "NORMAL",
        "specialNotes": "Less spicy please",
        "acceptedAt": "2026-10-11T12:00:00.000Z",
        "readyAt": null,
        "servedAt": null,
        "createdAt": "2026-10-11T11:58:00.000Z",
        "updatedAt": "2026-10-11T12:00:00.000Z",
        "qrContext": {
          "type": "TABLE",
          "identifier": "T-01",
          "displayName": "Table 01",
          "roomOrTableId": "f1a2b3c4-..."
        },
        "items": [
          {
            "id": "ki-1",
            "orderItemId": "oi-1",
            "menuItemId": "073fc4c7-...",
            "name": "Butter Chicken Special",
            "quantity": 2,
            "modifiers": [{ "name": "Full Portion" }],
            "modifiersSummary": "Full Portion",
            "specialInstructions": "Fresh coriander on top",
            "status": "PLACED"
          }
        ]
      }
    ]
  }
  ```

#### `GET /api/v1/kitchen/kots/:id`
- **Aliases**: `/api/kitchen/kots/:id`
- **Status**: **Verified & Implemented (Backend + Client Phase 3C)**
- **Purpose**: Retrieve a single KOT ticket by UUID.
- **Auth**: Bearer (`KITCHEN_STAFF`, `MANAGER`, `ADMIN`, `SUPER_ADMIN`).
- **Success (`200 OK`)**: Standard envelope containing formatted KOT.

#### `PATCH /api/v1/kitchen/kots/:id/status`
- **Aliases**: `/api/kitchen/kots/:id/status`
- **Status**: **Verified & Implemented (Backend + Client Phase 3C)**
- **Purpose**: Atomically advance KOT status across documented lifecycle (`NEW/PENDING` -> `ACCEPTED` -> `PREPARING` -> `READY` -> `SERVED`), synchronize linked `OrderItem` statuses, recalculate parent `Order` progress, record transactional outbox events, and guarantee post-commit WebSocket dispatching.
- **Auth**: Bearer (`KITCHEN_STAFF`, `MANAGER`, `ADMIN`, `SUPER_ADMIN`).
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
    "message": "KOT #KOT-20261011-0001 status updated to PREPARING",
    "data": {
      "id": "c71be39c-48c9-4b61-9c88-66170dcb7684",
      "kotNumber": "KOT-20261011-0001",
      "orderId": "b1a2c3d4-...",
      "orderNumber": "ORD-20261011-0001",
      "status": "PREPARING",
      "station": "Main Kitchen",
      "urgency": "NORMAL",
      "acceptedAt": "2026-10-11T12:00:00.000Z",
      "readyAt": null,
      "servedAt": null,
      "createdAt": "2026-10-11T11:58:00.000Z",
      "updatedAt": "2026-10-11T12:02:00.000Z",
      "qrContext": {
        "type": "TABLE",
        "identifier": "T-01",
        "displayName": "Table 01"
      },
      "items": [ ... ]
    }
  }
  ```
- **Error Codes**:
  - `400 VALIDATION_FAILED`: Invalid UUID path parameter, missing or unknown status enum value.
  - `401 UNAUTHORIZED`: Missing or invalid Bearer JWT.
  - `403 FORBIDDEN`: Insufficient role (e.g. `WAITER`, `CASHIER`).
  - `404 KOT_NOT_FOUND`: KOT does not exist or belongs to a different tenant.
  - `409 INVALID_STATUS_TRANSITION`: Illegal lifecycle transition (e.g., `NEW -> READY` or `SERVED -> PREPARING`). Repeated requests for the same status return `200 OK` safe replay.

---

### 3.4 Billing Desk & Payments

#### `POST /api/v1/bills/order/:orderId/generate`
- **Purpose**: Generate authoritative tax invoice snapshot for a completed or served dining order.
- **Auth**: Bearer (`CASHIER`, `MANAGER`, `ADMIN`, `SUPER_ADMIN`).
- **Eligibility**: Order status must be eligible (`SERVED`, `READY`, `CONFIRMED`, `PREPARING`). Rejects `CANCELLED` orders (`400 ORDER_NOT_ELIGIBLE`).
- **Concurrency & Idempotency**: Atomic row locking with sequential numbering (`INV-YYYYMMDD-XXXX`). If an invoice already exists for the order, idempotently returns the existing invoice (`200 OK`) without creating duplicates.
- **Table State**: Transitions dining table status to `BILL_REQUESTED`.
- **Success (`201 Created` or `200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "c71bf9e2-8924-4f51-b0f9-bf5541e411b0",
      "billNumber": "INV-20261011-0001",
      "orderId": "ord-1042-uuid",
      "status": "ISSUED",
      "subtotal": 800.00,
      "discounts": [],
      "totalDiscount": 0.00,
      "taxes": [
        { "name": "CGST (2.5%)", "ratePercentage": 2.5, "amount": 20.00 },
        { "name": "SGST (2.5%)", "ratePercentage": 2.5, "amount": 20.00 }
      ],
      "totalTax": 40.00,
      "grandTotal": 840.00,
      "paidAmount": 0.00,
      "dueAmount": 840.00,
      "items": [
        {
          "id": "bi-uuid",
          "name": "Chicken Tikka",
          "quantity": 2,
          "unitPrice": 400.00,
          "totalPrice": 800.00
        }
      ]
    },
    "message": "Bill generated successfully"
  }
  ```

#### `GET /api/v1/bills/:id`
- **Purpose**: Retrieve immutable bill snapshot and payment history by bill UUID or bill number.
- **Auth**: Bearer (`CASHIER`, `MANAGER`, `ADMIN`, `SUPER_ADMIN`).
- **Success (`200 OK`)**: Returns Bill detail matching envelope with `items`, `taxes`, `discounts`, and `payments`.

#### `GET /api/v1/bills/order/:orderId`
- **Purpose**: Retrieve active invoice for an order.
- **Auth**: Bearer (`CASHIER`, `MANAGER`, `ADMIN`, `SUPER_ADMIN`).
- **Success (`200 OK`)**: Returns Bill entity. Returns `404 BILL_NOT_FOUND` if unbilled.

#### `GET /api/v1/bills`
- **Purpose**: Paginated tenant-scoped listing of bills for cashier ledger and reporting.
- **Auth**: Bearer (`CASHIER`, `MANAGER`, `ADMIN`, `SUPER_ADMIN`).
- **Query Params**: `page` (default 1), `limit` (default 20), `status` (`ISSUED`, `PARTIALLY_PAID`, `PAID`, `VOID`).

#### `POST /api/v1/bills/:id/discount`
- **Purpose**: Apply authorized discount to an unfinalized bill with automatic tax recalculation.
- **Auth**: Bearer (`MANAGER`, `ADMIN`, `SUPER_ADMIN`). Rejects `CASHIER` (`403 FORBIDDEN`).
- **Request Body**:
  ```json
  {
    "type": "PERCENTAGE", // or "FLAT"
    "value": 10,
    "reason": "Manager Loyalty Privilege"
  }
  ```
- **Rules**: Cannot exceed bill subtotal (`400 INVALID_DISCOUNT`). Recomputes taxable base, CGST, SGST, and updates `dueAmount`.

#### `POST /api/v1/bills/:id/void`
- **Purpose**: Void an uncollected bill with mandatory manager audit trail.
- **Auth**: Bearer (`MANAGER`, `ADMIN`, `SUPER_ADMIN`).
- **Request Body**:
  ```json
  {
    "reason": "Guest disputed order charges prior to settlement"
  }
  ```
- **Rules**: Reason must be non-empty (`400 VOID_REASON_REQUIRED`). Bills with settled payments cannot be voided (`400 CANNOT_VOID_PAID_BILL`).

#### `POST /api/v1/bills/:id/payments`
- **Purpose**: Record tender payment against bill with atomic balance calculation and conditional table release.
- **Auth**: Bearer (`CASHIER`, `MANAGER`, `ADMIN`, `SUPER_ADMIN`).
- **Headers**: Supports `Idempotency-Key: <string>`.
- **Request Body**:
  ```json
  {
    "amount": 400.00,
    "method": "CASH", // "CASH" | "CARD" | "UPI" | "ROOM_CHARGE"
    "reference": "TXN-981240182",
    "notes": "Desk Cash Payment"
  }
  ```
- **Settlement & Table Release**:
  - Overpayment exceeding `dueAmount` rejected (`400 PAYMENT_EXCEEDS_DUE`).
  - Partial tender updates status to `PARTIALLY_PAID`.
  - Full settlement transitions bill to `PAID`, order to `COMPLETED`.
  - Dining table transitioned to `VACANT` **only if** no other active orders remain for that table.
  - `ROOM_CHARGE` accepted only for verified hotel room orders; dining table orders rejected (`400 INVALID_ROOM_CHARGE`).
- **Idempotency**: Replaying with the same key returns previously confirmed payment; key reuse with mismatched payload returns `409 IDEMPOTENCY_CONFLICT`.
- **Success (`201 Created`)**:
  ```json
  {
    "success": true,
    "data": {
      "payment": {
        "id": "pay-uuid",
        "billId": "bill-uuid",
        "amount": 400.00,
        "method": "CASH",
        "status": "COMPLETED"
      },
      "bill": {
        "id": "bill-uuid",
        "paidAmount": 400.00,
        "dueAmount": 440.00,
        "status": "PARTIALLY_PAID"
      }
    },
    "message": "Payment recorded successfully"
  }
  ```

---

### 3.5 Inventory & Recipe BOM Management (Phase 5 Verified)

#### `GET /api/v1/inventory/items`
- **Purpose**: List paginated inventory items with low-stock status and category filters.
- **Auth**: Bearer (`ADMIN`, `MANAGER`).
- **Query Params**: `page`, `limit`, `category`, `search`, `isLowStock` (`true` / `false`).
- **Success (`200 OK`)**:
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "id": "e1b1d1f0-...",
          "tenantId": "e1b1d1f0-...",
          "name": "Fresh Paneer",
          "sku": "PANEER-01",
          "category": "Dairy",
          "unit": "KG",
          "currentStock": 12.5,
          "minimumThreshold": 5.0,
          "costPerUnit": 320.0,
          "isLowStock": false,
          "isActive": true,
          "createdAt": "2026-10-11T12:00:00.000Z",
          "updatedAt": "2026-10-11T12:00:00.000Z"
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 20,
        "totalItems": 45,
        "totalPages": 3,
        "hasNextPage": true,
        "hasPrevPage": false
      }
    }
  }
  ```

#### `POST /api/v1/inventory/items`
- **Purpose**: Create a new inventory raw item.
- **Auth**: Bearer (`ADMIN`, `MANAGER`).
- **Request Body**:
  ```json
  {
    "name": "Basmati Rice",
    "sku": "RICE-BAS-01",
    "category": "Grains",
    "unit": "KG",
    "currentStock": 50.0,
    "minimumThreshold": 15.0,
    "costPerUnit": 85.0
  }
  ```
- **Success (`201 Created`)**: Returns newly created item object.
- **Errors**: `409 SKU_COLLISION`, `403 FORBIDDEN` for non-authorized roles.

#### `GET /api/v1/inventory/items/:id`
- **Purpose**: Fetch a single inventory item by ID.
- **Auth**: Bearer (`ADMIN`, `MANAGER`).
- **Success (`200 OK`)**: Returns item object.
- **Errors**: `404 NOT_FOUND` for non-existent or foreign tenant items.

#### `POST /api/v1/inventory/adjustments`
- **Purpose**: Authoritatively adjust inventory stock (RESTOCK, USAGE, WASTAGE, ADJUSTMENT, RETURN).
- **Auth**: Bearer (`ADMIN`, `MANAGER`).
- **Concurrency**: Guaranteed safe via PostgreSQL row-level locking (`SELECT ... FOR UPDATE`).
- **Request Body**:
  ```json
  {
    "itemId": "e1b1d1f0-...",
    "quantityChange": 10.0,
    "type": "RESTOCK",
    "reason": "Supplier shipment received invoice #PO-9021",
    "unit": "KG"
  }
  ```
- **Success (`201 Created`)**: Returns `{ transaction: InventoryTransaction, remainingStockAfter: number }`.
- **Errors**: `400 INSUFFICIENT_STOCK` (if deduction exceeds stock), `404 NOT_FOUND`.

#### `GET /api/v1/inventory/transactions`
- **Purpose**: Retrieve historical audit log of stock movements.
- **Auth**: Bearer (`ADMIN`, `MANAGER`).
- **Query Params**: `page`, `limit`, `itemId`, `type`.
- **Success (`200 OK`)**: Paginated list of inventory transactions with associated item names.

#### `GET /api/v1/inventory/recipes`
- **Purpose**: List all recipes and ingredient mappings for tenant menu items.
- **Auth**: Bearer (`ADMIN`, `MANAGER`).
- **Success (`200 OK`)**: List of Recipe objects with ingredients.

#### `GET /api/v1/inventory/recipes/:menuItemId`
- **Purpose**: Get recipe specification for a specific menu item.
- **Auth**: Bearer (`ADMIN`, `MANAGER`).
- **Success (`200 OK`)**: Returns Recipe object or null.

#### `POST /api/v1/inventory/recipes`
- **Purpose**: Upsert Recipe Bill of Materials (BOM) for a menu item.
- **Auth**: Bearer (`ADMIN`, `MANAGER`).
- **Request Body**:
  ```json
  {
    "menuItemId": "c2b1d1f0-...",
    "notes": "Standard portion for Paneer Tikka",
    "ingredients": [
      {
        "inventoryItemId": "e1b1d1f0-...",
        "quantity": 200,
        "unit": "GRAM"
      },
      {
        "inventoryItemId": "f1b1d1f0-...",
        "quantity": 30,
        "unit": "ML"
      }
    ]
  }
  ```
- **Success (`201 Created` / `200 OK`)**: Returns recipe object with ingredients.
- **Errors**: `400 INVALID_INGREDIENTS` (if ingredient IDs do not exist or belong to another tenant).

---

### 3.6 Hardware & Print Jobs

#### `GET /api/v1/printers`
- **Purpose**: List all printers configured for the authenticated tenant.
- **Auth**: Bearer (`ADMIN`, `MANAGER`, `CASHIER`).
- **Query Params**: `station` (optional filter).
- **Success (`200 OK`)**: List of `Printer` objects with operational metrics (`isOnline`, `lastPingAt`).

#### `POST /api/v1/printers`
- **Purpose**: Register a new thermal network or USB printer.
- **Auth**: Bearer (`ADMIN`).
- **Request Body**:
  ```json
  {
    "name": "Main Kitchen Thermal KOT",
    "type": "THERMAL_KOT",
    "connectionType": "NETWORK_TCP",
    "ipAddress": "192.168.1.200",
    "port": 9100,
    "station": "KITCHEN",
    "location": "Main Hot Line",
    "paperWidthMm": 80,
    "isActive": true,
    "isDefault": false
  }
  ```
- **Success (`201 Created`)**: Returns newly created `Printer` object.
- **Errors**: `400 VALIDATION_ERROR`, `403 FORBIDDEN` (non-admin).

#### `GET /api/v1/printers/:id`
- **Purpose**: Retrieve details of a specific printer.
- **Auth**: Bearer (`ADMIN`, `MANAGER`, `CASHIER`).
- **Success (`200 OK`)**: Single `Printer` object.
- **Errors**: `404 PRINTER_NOT_FOUND`.

#### `PATCH /api/v1/printers/:id`
- **Purpose**: Update printer configuration, paper width, or enable/disable state.
- **Auth**: Bearer (`ADMIN`).
- **Success (`200 OK`)**: Updated `Printer` object.

#### `DELETE /api/v1/printers/:id`
- **Purpose**: Remove a printer from the registry (rejects if active pending jobs exist).
- **Auth**: Bearer (`ADMIN`).
- **Success (`200 OK`)**: `{ message: "Printer deleted successfully" }`.

#### `POST /api/v1/printers/:id/ping`
- **Purpose**: Execute active network socket probe on port 9100 to verify physical reachability.
- **Auth**: Bearer (`ADMIN`, `MANAGER`).
- **Success (`200 OK`)**: `{ isOnline: boolean, latencyMs?: number, error?: string }`.

#### `POST /api/v1/printers/:id/test-print`
- **Purpose**: Transmit a standard diagnostic self-test slip to verify ESC/POS rendering and cutter.
- **Auth**: Bearer (`ADMIN`).
- **Success (`201 Created`)**: Queues a `TEST_PAGE` print job returning the created job.

#### `GET /api/v1/printers/summary`
- **Purpose**: Operational dashboard metrics (totalPrinters, onlinePrinters, offlinePrinters, pendingJobs, failedJobs, uncertainJobs).
- **Auth**: Bearer (`ADMIN`, `MANAGER`, `CASHIER`).
- **Success (`200 OK`)**: Aggregated metrics object.

#### `GET /api/v1/print-jobs`
- **Purpose**: List print queue jobs with status and printer filters.
- **Auth**: Bearer (`ADMIN`, `MANAGER`, `CASHIER`).
- **Query Params**: `status`, `printerId`, `page`, `limit`.
- **Success (`200 OK`)**: Paginated list of print jobs with nested printer metadata.

#### `POST /api/v1/print-jobs`
- **Purpose**: Enqueue a durable print job (KOT, BILL_RECEIPT, TEST_PAGE) with idempotency key.
- **Auth**: Bearer (`ADMIN`, `MANAGER`, `CASHIER`).
- **Headers**: `X-Idempotency-Key` (optional).
- **Request Body**:
  ```json
  {
    "printerId": "1f522b19-...",
    "type": "KOT",
    "referenceId": "KOT-20261011-0042",
    "payload": {
      "kotNumber": "KOT-20261011-0042",
      "tableOrRoom": "Table 04",
      "items": [{ "name": "Chicken Tikka", "quantity": 2 }]
    },
    "idempotencyKey": "kot-print-20261011-0042"
  }
  ```
- **Success (`201 Created`)**: Returns queued `PrintJob` object. Suppresses duplicates if key matches existing job.

#### `POST /api/v1/print-jobs/:id/retry`
- **Purpose**: Controlled manual retry for eligible `FAILED` or `UNCERTAIN` print jobs.
- **Auth**: Bearer (`ADMIN`, `MANAGER`, `CASHIER`).
- **Success (`200 OK`)**: Resets status to `QUEUED`, resets error message, clears exponential backoff.
- **Errors**: `400 INVALID_JOB_STATE_FOR_RETRY` (if job is already `COMPLETED` or `QUEUED`).

#### `POST /api/v1/print-jobs/:id/reprint`
- **Purpose**: Authorized duplicate reprint copy. Creates a NEW job with `isReprint = true` and `*** DUPLICATE / REPRINT COPY ***` watermark.
- **Auth**: Bearer (`ADMIN`, `MANAGER`, `CASHIER`).
- **Request Body**: `{ "reason": "Guest misplaced invoice copy" }`.
- **Success (`201 Created`)**: Newly created reprint `PrintJob` object.

#### `POST /api/v1/print-jobs/:id/cancel`
- **Purpose**: Abort an unprinted `QUEUED` job before hardware transmission.
- **Auth**: Bearer (`ADMIN`, `MANAGER`).
- **Success (`200 OK`)**: Updated `PrintJob` with status `CANCELLED`.
