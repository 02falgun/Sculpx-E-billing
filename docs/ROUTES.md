# Route Architecture & Navigation Matrix

## 1. Route Map

| Path | Layout | Target Persona | Access Guard | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/` | Root | Public | None | Welcome & operational portal |
| `/menu/[qrToken]` | Customer | Guests / Diners | Valid QR Token | Dynamic menu with room/table context |
| `/cart` | Customer | Guests / Diners | QR Context present | Cart review & modifier adjustments |
| `/checkout` | Customer | Guests / Diners | Cart with items | Pay Now / Pay Later & guest details |
| `/order/[orderId]` | Customer | Guests / Diners | Public / Order ID | Real-time order progress timeline |
| `/bill/[billId]` | Customer | Guests / Diners | Public / Bill ID | Digital itemized bill & payment receipt |
| `/login` | Auth | Staff / Admin | Public (unauthenticated) | Staff PIN & password authentication |
| `/dashboard` | Staff | All Staff | Authenticated | High-level floor & shift metrics |
| `/pos` | Staff | Waiters / Captains | Staff / Admin | Quick POS & floor terminal |
| `/pos/new-order` | Staff | Waiters / Captains | Staff / Admin | Staff order creation wizard |
| `/tables` | Staff | Waiters / Captains | Staff / Admin | Table floor map & active status |
| `/orders` | Staff | Waiters / Cashiers | Staff / Admin | Active restaurant order list |
| `/orders/[orderId]` | Staff | Waiters / Cashiers | Staff / Admin | Order detail, item add, cancel |
| `/billing` | Staff | Cashiers / Managers | Staff / Admin | Billing desk & unsettled tabs |
| `/billing/[billId]` | Staff | Cashiers / Managers | Staff / Admin | Payment collection & invoice print |
| `/kitchen` | Kitchen | Line Cooks / Chefs | Kitchen / Admin | Fullscreen Kitchen Display System (KDS) |
| `/admin` | Admin | Managers / Admins | Admin / Super Admin | Back-office overview & KPIs |
| `/admin/menu` | Admin | Managers / Admins | Admin | Item catalogue & prices |
| `/admin/menu/categories` | Admin | Managers / Admins | Admin | Menu category ordering |
| `/admin/menu/modifiers` | Admin | Managers / Admins | Admin | Add-ons & modifier groups |
| `/admin/rooms` | Admin | Managers / Admins | Admin | Hotel room configuration |
| `/admin/tables` | Admin | Managers / Admins | Admin | Restaurant table layout |
| `/admin/qr` | Admin | Managers / Admins | Admin | QR code generation & PDF export |
| `/admin/inventory` | Admin | Managers / Admins | Admin | Inventory stock overview |
| `/admin/inventory/items` | Admin | Managers / Admins | Admin | Raw material SKUs & thresholds |
| `/admin/inventory/recipes` | Admin | Managers / Admins | Admin | Recipe ingredient mappings |
| `/admin/inventory/transactions` | Admin | Managers / Admins | Admin | Stock movement audit log |
| `/admin/users` | Admin | Super Admin | Super Admin | Staff accounts & RBAC roles |
| `/admin/reports` | Admin | Managers / Admins | Admin | Sales, GST & consumption reports |
| `/admin/printers` | Admin | Managers / Admins | Admin | Thermal printer fleet status |
| `/admin/print-jobs` | Admin | Managers / Admins | Admin | Print queue logs & retry actions |
| `/admin/settings` | Admin | Managers / Admins | Admin | Hotel settings, tax slabs, rules |
