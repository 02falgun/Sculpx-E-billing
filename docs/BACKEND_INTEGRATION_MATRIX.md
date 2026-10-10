# SCULPX E-Billing — Frontend/Backend Integration Matrix

> **Document Status**: Complete Baseline Handover Specification  
> **Audience**: Backend Integration Engineer, System Architect, Frontend Pair  
> **Target Stack**: Node.js REST API + PostgreSQL + WebSockets on VPS  
> **Classification Legend**:
> - `[EXISTING-MOCK]`: Frontend UI/hooks functional with in-memory mock service layer.
> - `[PROPOSED-CONTRACT]`: Target REST/WS contract specified by frontend; awaiting backend verification.
> - `[NEEDS-CONFIRMATION]`: Open architectural decision requiring backend agreement.

---

## 1. Feature-by-Feature Integration Matrix

| Feature Area | Frontend Route | Screen / Component | Hook / Store | Current Service | Target Endpoint | HTTP Method | Request Schema | Response Schema | Required Role / Perms | Real-Time WS Events | Acceptance Criteria |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **QR Context (Table)** | `/menu/table/[tableId]` | `QRBanner`, `MenuCatalog` | `useQRContext(tableId)` | `menuApi.getContextByQrToken` | `/api/v1/menu/context/:token` | `GET` | *None (URL param)* | `ApiResponse<QRContext>` | Public (None) | None | Validates table token, returns restaurant, section, table number, capacity, and active status. |
| **QR Context (Room)** | `/menu/room/[roomId]` | `QRBanner`, `MenuCatalog` | `useQRContext(roomId)` | `menuApi.getContextByQrToken` | `/api/v1/menu/context/:token` | `GET` | *None (URL param)* | `ApiResponse<QRContext>` | Public (None) | None | Resolves room token, loads guest in-room dining metadata and folio eligibility. |
| **Menu Categories** | `/menu/*` | `CategoryTabs` | `useCategories()` | `menuApi.getCategories` | `/api/v1/menu/categories` | `GET` | *None* | `ApiResponse<Category[]>` | Public (None) | None | Returns sorted list of active menu categories with item counts and display orders. |
| **Menu Items & Search** | `/menu/*` | `MenuItemCard`, `MenuCatalog` | `useMenuItems(params)` | `menuApi.getMenuItems` | `/api/v1/menu/items` | `GET` | Query: `categoryId`, `search` | `ApiResponse<MenuItem[]>` | Public (None) | `ITEM_AVAILABILITY_CHANGED` | Lists active items with modifier groups, dietary tags, preparation times, and real-time stock availability. |
| **Item Detail & Modifiers** | `/menu/*` | `ModifierModal` | `useMenuItem(id)` | `menuApi.getMenuItemById` | `/api/v1/menu/items/:id` | `GET` | *None (URL param)* | `ApiResponse<MenuItem>` | Public (None) | None | Loads modifier options (single-select/multi-select), minimum/maximum selections, and add-on pricing. |
| **Cart Pre-Validation** | `/cart`, `/checkout` | `CartReviewList`, `CheckoutForm` | `cartStore` | `orderApi.validateOrder` | `/api/v1/orders/validate` | `POST` | `CreateOrderPayload` | `ApiResponse<OrderValidationResult>` | Public (None) | None | Server checks price snapshots, calculates exact taxes/discounts, verifies ingredients stock. |
| **Order Placement (Customer)** | `/checkout` | `CheckoutForm` | `useCreateOrder()` | `orderApi.createOrder` | `/api/v1/orders` | `POST` | `CreateOrderPayload` + `Idempotency-Key` | `ApiResponse<Order>` | Public (None) | `ORDER_CREATED`, `KOT_CREATED` | Server persists order, generates initial KOT(s), reserves stock, returns canonical order ID. |
| **Live Order Tracking** | `/order/[orderId]` | `LiveTrackingHeader`, `OrderStatusTimeline` | `useOrder(orderId)`, `useWebSocket` | `orderApi.getOrderById` | `/api/v1/orders/:id` | `GET` | *None (URL param)* | `ApiResponse<Order>` | Public / Guest Token | `ORDER_STATUS_UPDATED`, `ORDER_CANCELLED` | Displays real-time order progression (CONFIRMED -> PREPARING -> READY -> SERVED). |
| **Customer Order Cancel** | `/order/[orderId]` | `OrderCancelModal` | `useCancelOrder()` | `orderApi.cancelOrder` | `/api/v1/orders/:id/cancel` | `POST` | `{ reason: string }` | `ApiResponse<Order>` | Public (Within window) / Staff | `ORDER_CANCELLED` | Validates cancellation window (only before PREPARING), halts KOTs, restores reserved stock. |
| **Customer Digital Bill** | `/bill/[billId]` | `InvoiceHeader`, `InvoiceItemsTable` | `useBill(billId)` | `billingApi.getBillById` | `/api/v1/bills/:id` | `GET` | *None (URL param)* | `ApiResponse<Bill>` | Public / Customer Token | `BILL_UPDATED`, `PAYMENT_RECORDED` | Displays official GST tax invoice, breakdown (CGST/SGST/service charges), payment balance. |
| **Customer Payment (Online)** | `/bill/[billId]` | `PaymentModal` | `useRecordPayment()` | `paymentApi.recordPayment` | `/api/v1/bills/:id/payments` | `POST` | `RecordPaymentPayload` + `Idempotency-Key` | `ApiResponse<Payment>` | Public / Customer Token | `PAYMENT_RECORDED`, `BILL_UPDATED` | Records UPI/Card payment reference, transitions bill to PAID, emits payment receipt event. |
| **Staff Table Grid** | `/staff`, `/staff/tables` | `TableGrid`, `TableCard` | `useTables()` | `tableApi.getTables` | `/api/v1/tables` | `GET` | *None* | `ApiResponse<Table[]>` | WAITER, CAPTAIN, MANAGER | `TABLE_STATUS_CHANGED` | Displays live floor table layout, occupancies, guest counts, and assigned waiters. |
| **Staff POS Terminal** | `/staff/pos` | `POSTerminal` | `useMenuItems()`, `posStore` | `orderApi.createOrder` | `/api/v1/orders` | `POST` | `CreateOrderPayload` (source: `STAFF_POS`) | `ApiResponse<Order>` | WAITER, CAPTAIN, MANAGER | `ORDER_CREATED`, `KOT_CREATED` | Mobile-optimized waiter POS for rapid table-side item entry, seat assignment, and modifier selection. |
| **Kitchen KDS Board** | `/kitchen` | `KDSBoard`, `KOTCard`, `KOTTimer` | `useActiveKOTs()`, `useWebSocket` | `kitchenApi.getActiveKOTs` | `/api/v1/kitchen/kots` | `GET` | *None* | `ApiResponse<KOT[]>` | KITCHEN_STAFF, MANAGER | `KOT_CREATED`, `KOT_STATUS_UPDATED` | Live kitchen display rendering open tickets, preparation timers, priority tags, and item notes. |
| **Kitchen Status Step** | `/kitchen` | `KOTCard` | `useUpdateKOTStatus()` | `kitchenApi.updateKOTStatus` | `/api/v1/kitchen/kots/:id/status` | `PATCH` | `UpdateKOTStatusPayload` | `ApiResponse<KOT>` | KITCHEN_STAFF, MANAGER | `KOT_STATUS_UPDATED`, `ORDER_STATUS_UPDATED` | Advances KOT: `ACCEPTED` -> `PREPARING` -> `READY` -> `SERVED`. Auto-updates parent Order. |
| **Cashier Settlement Desk** | `/cashier`, `/cashier/bills` | `BillingDeskTable` | `useAllBills()` | `billingApi.getAllBills` | `/api/v1/bills` | `GET` | Query: `status`, `page`, `limit` | `ApiResponse<PaginatedResult<Bill>>` | CASHIER, MANAGER | `BILL_UPDATED`, `PAYMENT_RECORDED` | Full cashier ledger showing open tabs, unpaid balances, split bills, and daily collections. |
| **Cashier Bill Generation** | `/cashier/bills` | `BillingDeskTable` | `billingApi.generateBillForOrder` | `billingApi.generateBillForOrder` | `/api/v1/bills/order/:orderId/generate` | `POST` | *None* | `ApiResponse<Bill>` | CASHIER, MANAGER | `BILL_UPDATED` | Generates final tax invoice snapshot locking all ordered item rates, taxes, and service charges. |
| **Cashier Record Payment** | `/cashier` | `PaymentModal` | `useRecordPayment()` | `paymentApi.recordPayment` | `/api/v1/bills/:id/payments` | `POST` | `RecordPaymentPayload` | `ApiResponse<Payment>` | CASHIER, MANAGER | `PAYMENT_RECORDED`, `BILL_UPDATED` | Settles cash, card, room-charge folio, or manual UPI transactions. Triggers thermal receipt print. |
| **Manager Overview** | `/manager` | `ManagerDashboard` | `useOrders()`, `useAllBills()` | Aggregated API queries | `/api/v1/analytics/realtime` | `GET` | *None* | `ApiResponse<RealtimeStats>` | MANAGER, ADMIN | Multi-channel WS events | Operational dashboard showing active tables, kitchen bottlenecks, void exceptions, and shift turnover. |
| **Admin Menu Catalog** | `/admin/menu` | `MenuCatalogManager` | `useMenuItems()` | `menuApi.createMenuItem` / `updateMenuItem` | `/api/v1/menu/items` | `POST`, `PATCH`, `DELETE` | `Partial<MenuItem>` | `ApiResponse<MenuItem>` | ADMIN, SUPER_ADMIN | `MENU_UPDATED` | Full CRUD over menu items, categories, pricing, spice levels, allergens, and modifier groups. |
| **Admin Inventory Stock** | `/admin/inventory` | `AdminInventoryPage` | `useInventoryItems()`, `useAdjustStock()` | `inventoryApi.getItems`, `recordStockAdjustment` | `/api/v1/inventory/items`, `/api/v1/inventory/adjustments` | `GET`, `POST` | Stock adjustment payload | `ApiResponse<InventoryTransaction>` | ADMIN, SUPER_ADMIN | `STOCK_LEVEL_ALERT` | Real-time ingredient tracking, threshold warnings, restock logging, and wastage audit. |
| **Admin Hardware Printers** | `/admin/printers`, `/admin/print-jobs` | `PrinterFleetManager` | `usePrinters()`, `usePrintJobs()` | `printerApi.getPrinters`, `retryPrintJob` | `/api/v1/printers`, `/api/v1/print-jobs` | `GET`, `POST` | Retry / Reprint payload | `ApiResponse<PrintJob>` | ADMIN, SUPER_ADMIN | `PRINT_JOB_STATUS` | Monitors network thermal printers (KOT & Billing), error statuses, offline alerts, and job re-queuing. |
| **Admin QR Fleet** | `/admin/qr` | `QRCodeGeneratorManager` | `useTables()`, `useRooms()` | Local generation with canonical URL | `/api/v1/qr/batch-generate` | `POST` | Proposed QR payload | `ApiResponse<QRCodeRecord[]>` | ADMIN, SUPER_ADMIN | None | Table/Room QR generation, high-res SVG/PNG export, activation toggle, and thermal print tags. |
| **Admin Staff & Access** | `/admin/users` | `AdminUsersPage` | `userApi.getUsers()` | `userApi.getUsers` | `/api/v1/users` | `GET`, `POST`, `PATCH` | User creation / Role payload | `ApiResponse<User[]>` | ADMIN, SUPER_ADMIN | None | Employee roster, station credentials, PIN generation, and role assignment. |

---

## 2. API Contract Protocol Standards

1. **Base URL**: Default: `/api/v1` (Configured via `NEXT_PUBLIC_API_URL`).
2. **Security**: Bearer JWT in `Authorization: Bearer <token>` header (automatically injected by `ApiClient` from client session).
3. **Envelope**: Standard JSON envelope for all API communications:
   - Success: `{ "success": true, "data": T, "message"?: string }`
   - Failure: `{ "success": false, "data": null, "error": { "code": string, "message": string, "details"?: unknown } }`
4. **Idempotency**: All payment, order creation, and stock mutation endpoints accept `Idempotency-Key` headers to guarantee zero double-charges or duplicate tickets during network retries.
