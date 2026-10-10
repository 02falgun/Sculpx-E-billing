# SCULPX E-Billing — Database Migrations & Seed Data Handover

> **Audience**: Backend Database Architect, Data Engineer  
> **Topic**: PostgreSQL Schema Lifecycle, Migrations, Seed Reference Data, Backups  

---

## 1. PostgreSQL Schema Responsibility

The backend developer will implement and manage the PostgreSQL database schema. The frontend repository does NOT connect directly to PostgreSQL, run migrations, or store database credentials.

### Recommended Tooling:
- **Migration Framework**: Prisma, Drizzle ORM, or Knex.js migrations.
- **Connection Pooling**: `pg-pool` or PgBouncer with maximum 20-50 pooled connections per application instance.

---

## 2. Realistic Seed Data Reference

The frontend includes realistic, pre-structured hospitality demo data located in:
`src/mocks/mockDb.ts`

The backend developer can use this dataset as the direct baseline for writing database seed scripts (`seeds/01_initial_hospitality_seed.sql`):

### 2.1 Demo Staff Accounts
| Name | Role | Email | Pre-set Password | Permissions |
|---|---|---|---|---|
| **Kavya Kumar** | `SUPER_ADMIN` | `superadmin@demo.com` | `admin123` | `all_superadmin`, `audit_logs`, `integrations` |
| **Rajesh Sharma** | `ADMIN` | `admin@demo.com` | `admin123` | `all_admin`, `manage_menu`, `manage_printers`, `manage_inventory` |
| **Vikram Mehta** | `MANAGER` | `manager@demo.com` | `manager123` | `view_operations`, `override_orders`, `view_reports` |
| **Chef Sanjeev** | `KITCHEN_STAFF` | `kitchen@demo.com` | `chef123` | `view_kds`, `accept_kot`, `start_cooking`, `mark_ready` |
| **Pooja Verma** | `CASHIER` | `cashier@demo.com` | `cashier123` | `view_bills`, `collect_payments`, `print_receipts`, `discounts` |
| **Rahul Sharma** | `WAITER` | `waiter@demo.com` | `waiter123` | `view_tables`, `create_orders`, `pos_access`, `request_bill` |

### 2.2 Demo Menu Categories & Items
- **Appetizers & Starters**:
  - Paneer Tikka (₹280) — VEG, Spice: MEDIUM
  - Chicken Seekh Kebab (₹340) — NON_VEG, Spice: HOT
  - Crispy Corn Salt & Pepper (₹220) — VEGAN, Spice: MILD
- **Main Course**:
  - Murgh Makhani / Butter Chicken (₹440) — NON_VEG, Modifiers: Half / Full
  - Dal Makhani (₹290) — VEG, Preparation: 15 min
  - Paneer Butter Masala (₹360) — VEG
- **Breads & Rice**:
  - Butter Naan (₹60), Garlic Naan (₹75), Jeera Rice (₹180), Hyderabadi Dum Biryani (₹420)
- **Beverages & Desserts**:
  - Masala Chai (₹60), Fresh Lime Soda (₹90), Gulab Jamun (2 pcs) (₹120)

### 2.3 Demo Physical Stations
- **Restaurant Tables**: `T01` (4 seats), `T02` (2 seats), `T03` (6 seats), `T04` (4 seats), `T05` (VIP 8 seats).
- **Guest Rooms**: `Room 101` (Deluxe), `Room 102` (Suite), `Room 201` (Executive Suite).
- **Hardware Printers**:
  - `prn-kot-01`: Thermal 80mm Kitchen Hot Station (IP: `192.168.1.201`)
  - `prn-rec-01`: Thermal 80mm Reception Cashier Counter (IP: `192.168.1.202`)

---

## 3. Database Deliverables Required from Backend Developer

Please establish and document:

1. [ ] **Migration Scripts**: Versioned SQL files or migration directory (`migrations/`).
2. [ ] **Seed Script**: Script executing initial insert of categories, menu items, modifiers, demo tables, and staff.
3. [ ] **Transaction Boundaries**: Atomic transactions wrapped around:
   - Order creation + initial KOT insertion + ingredient deduction.
   - Payment settlement + bill balance update.
   - Order cancellation + stock restoration.
4. [ ] **Daily Automated Backups**: `pg_dump` cron job backing up to secure offsite storage (S3 / B2).
