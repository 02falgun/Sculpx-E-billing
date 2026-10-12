# SCULPX E-BILLING — Multi-Tenant, Franchise & Multi-Location Platform Architecture

**Author**: Principal Software Architect & Application Security Engineer  
**Status**: Implemented, Migrated & Verified  
**Date**: October 2026  

---

## 1. Executive Summary & Platform Mission

SCULPX E-Billing has been transformed from a single-property application into a true enterprise-grade, multi-tenant hospitality platform supporting:
1. **Independent Restaurants**: Single-location dining properties operating without corporate hierarchy.
2. **Independent Hotels**: Single-location accommodation properties with in-room QR dining folios.
3. **Combined Hotel & Restaurant Properties**: Unified property management with floor tables, guest rooms, centralized KDS, and folio billing.
4. **Franchise Organizations**: Parent corporate brands or franchise groups managing multiple operational branches with brand configuration and grouped reporting.
5. **Hospitality Chains**: Multi-unit enterprise groups scaling across regions, currencies, and timezones.

### Fundamental Tenet: Super Admin Exclusive Control
Only platform **`SUPER_ADMIN`** may:
- Create franchise organizations.
- Onboard independent businesses.
- Create and provision operational locations.
- Reassign or suspend locations.
- Provision initial franchise owners and branch administrators.

---

## 2. Structural Hierarchy & Data Modeling

The platform maintains strict separation between **Corporate Parent**, **Physical Location**, and **Operational Security Boundary**:

```text
SCULPX PLATFORM
 ├── Platform SUPER_ADMIN (Platform governance, onboarding, cross-tenant audit)
 │
 ├── Franchise Organization: "Taj Hospitality Group" (type: FRANCHISE)
 │    ├── Location 1: "Taj Lands End - Bandra" (type: COMBINED, INR, Asia/Kolkata)
 │    │    └── Operational Tenant: 9aef0c8e-... (Tables, Rooms, Menu, Orders, Bills, KDS)
 │    ├── Location 2: "Taj Palace - Colaba" (type: RESTAURANT, INR, Asia/Kolkata)
 │    │    └── Operational Tenant: c2d3e4f5-... (Tables, Menu, Orders, Bills, KDS)
 │    └── Franchise Owner: "owner@taj.com" (Scoped to Taj Hospitality Group)
 │
 └── Independent Business: "Sculpx Sea Breeze Cafe" (organizationId: null)
      ├── Location: "Sculpx Sea Breeze Cafe" (type: RESTAURANT, INR, Asia/Kolkata)
      │    └── Operational Tenant: b1a2c3d4-... (Tables, Menu, Orders, Bills, KDS)
      └── Independent Admin: "admin@seabreeze.com" (Scoped to Sea Breeze location only)
```

### 2.1 Prisma Schema Models (`backend/prisma/schema.prisma`)

```prisma
enum OrganizationType {
  FRANCHISE
  INDEPENDENT_GROUP
  ENTERPRISE_CHAIN
}

enum LocationType {
  RESTAURANT
  HOTEL
  COMBINED
}

enum EntityStatus {
  ACTIVE
  SUSPENDED
  ARCHIVED
}

model Organization {
  id            String            @id @default(uuid())
  name          String
  code          String            @unique
  type          OrganizationType  @default(FRANCHISE)
  legalName     String?
  contactEmail  String?
  contactPhone  String?
  address       String?
  status        EntityStatus      @default(ACTIVE)
  brandSettings Json?
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  locations     Location[]
  members       OrganizationUser[]

  @@map("organizations")
}

model Location {
  id              String         @id @default(uuid())
  organizationId  String?
  organization    Organization?  @relation(fields: [organizationId], references: [id], onDelete: SetNull)
  tenantId        String         @unique
  tenant          Tenant         @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  name            String
  code            String         @unique
  locationType    LocationType   @default(COMBINED)
  address         String?
  city            String?
  state           String?
  postalCode      String?
  country         String         @default("India")
  timezone        String         @default("Asia/Kolkata")
  currency        String         @default("INR")
  currencySymbol  String         @default("₹")
  contactEmail    String?
  contactPhone    String?
  gstin           String?
  enabledModules  Json?
  status          EntityStatus   @default(ACTIVE)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  userAssignments UserLocationAssignment[]

  @@index([organizationId])
  @@index([tenantId])
  @@index([status])
  @@map("locations")
}

model OrganizationUser {
  id              String       @id @default(uuid())
  organizationId  String
  organization    Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  userId          String
  user            User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  role            String       @default("FRANCHISE_OWNER")
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  @@unique([organizationId, userId])
  @@map("organization_users")
}

model UserLocationAssignment {
  id          String   @id @default(uuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  locationId  String
  location    Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
  role        String?
  isPrimary   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([userId, locationId])
  @@index([userId])
  @@index([locationId])
  @@map("user_location_assignments")
}
```

---

## 3. Database Migration & Historical Preservation

### 3.1 Additive Migration
Prisma migration `20261013000000_add_organizations_and_locations` applies non-destructive additions:
- Created `organizations`, `locations`, `organization_users`, and `user_location_assignments` tables.
- Foreign keys use `ON DELETE SET NULL` for organization-to-location, preserving locations if an organization is archived.
- Unique constraint on `locations.tenantId` enforces 1-to-1 mapping with operational tenants.

### 3.2 Automated Pilot Backfill
To guarantee uninterrupted operation for existing pilot users and tenants:
```sql
-- Backfill existing pilot tenant into an Independent Location
INSERT INTO "locations" (
  "id", "tenantId", "name", "code", "locationType", "address", "city", "state", "postalCode",
  "country", "timezone", "currency", "currencySymbol", "gstin", "enabledModules", "status", "createdAt", "updatedAt"
)
SELECT 
  gen_random_uuid(), "id", "name", "slug", 'COMBINED', "address", 'Mumbai', 'Maharashtra', '400001',
  'India', 'Asia/Kolkata', 'INR', '₹', "gstin",
  '["table_ordering", "room_ordering", "pos_billing", "kitchen_kds", "inventory", "reports"]'::jsonb,
  'ACTIVE', NOW(), NOW()
FROM "tenants"
WHERE "id" NOT IN (SELECT "tenantId" FROM "locations");

-- Backfill existing users into UserLocationAssignment
INSERT INTO "user_location_assignments" ("id", "userId", "locationId", "role", "isPrimary", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(), u."id", l."id", u."role", true, NOW(), NOW()
FROM "users" u
JOIN "locations" l ON l."tenantId" = u."tenantId"
ON CONFLICT ("userId", "locationId") DO NOTHING;
```

---

## 4. API Endpoints Contract

All endpoints are registered under both `/organizations`, `/locations` and `/api/v1/organizations`, `/api/v1/locations`.

### 4.1 Organizations API (`/api/v1/organizations`)
- `GET /`: List all organizations with location counts and active/suspended statistics.
- `POST /`: Super Admin creates organization entity.
- `POST /franchise/onboard`: Super Admin executes atomic 5-step wizard in a single database transaction:
  - Creates `Organization`.
  - Creates first `Location`.
  - Creates associated operational `Tenant`.
  - Provisions `Franchise Owner` account and creates `OrganizationUser` membership.
  - Provisions optional `Location Administrator` account and creates `UserLocationAssignment`.
  - Emits security audit log.
- `GET /:id`: Organization details with full location catalog and owner roster.
- `PUT /:id`: Update organization details or status (`ACTIVE`, `SUSPENDED`, `ARCHIVED`).
- `GET /:id/stats`: Currency-segregated financial and operational totals (`revenueByCurrency`).

### 4.2 Locations API (`/api/v1/locations`)
- `GET /`: List accessible locations (scoped to user's permissions).
- `POST /`: Super Admin provisions new location (independent or assigned to franchise) + operational `Tenant`.
- `GET /:id`: Location details with parent organization and operational tenant status.
- `PUT /:id`: Update address, timezone, currency, tax rates (synced to operational `Tenant`).
- `PUT /:id/status`: Update status (`ACTIVE`, `SUSPENDED`, `ARCHIVED`).
- `POST /:id/assign-user`: Assign staff or administrator to location.
- `GET /:id/stats`: Database-backed operational metrics:
  - `tablesCount`, `roomsCount`, `qrCount`, `categoriesCount`, `menuItemsCount`, `staffCount`, `ordersCount`, `totalRevenue`.

---

## 5. Security & Isolation Controls

### 5.1 Authorization Scopes & Tokens
- Access tokens contain `tokenVersion` for instantaneous session revocation upon password reset or role alteration.
- `AuthenticatedUser` resolved by `authenticate` middleware attaches:
  - `authorizedTenantIds`: Array of tenant UUIDs derived from `UserLocationAssignment`.
  - `authorizedLocationIds`: Array of location UUIDs.
  - `authorizedOrganizationIds`: Array of organization UUIDs derived from `OrganizationUser`.
  - `organizationRole`: Organization-level role.

### 5.2 Server-Side Location Scope Enforcement (`requireTenantScope`)
The middleware inspects `x-target-tenant-id` or `x-location-id`:
1. Verifies that the caller is `SUPER_ADMIN` or has the requested tenant in `authorizedTenantIds`.
2. Rejects unauthorized attempts with `403 Forbidden` (`code: FORBIDDEN`).
3. **Suspension Protection**: If the target location's status is `SUSPENDED`, any state-modifying HTTP mutation (`POST`, `PUT`, `PATCH`, `DELETE`) on tables, rooms, orders, or bills is aborted with:
   ```json
   {
     "success": false,
     "error": {
       "code": "LOCATION_SUSPENDED",
       "message": "This operational location is currently suspended. Operational modifications are disabled."
     }
   }
   ```
   Read requests (`GET`) are permitted to allow historical invoice review and tax auditing.

---

## 6. Frontend Integration & User Experience

### 6.1 Multi-Location Header Selector (`LocationSelector.tsx`)
- Displayed prominently in the Admin Header.
- Groups locations by Franchise and Independent Business.
- Displays active branch name, type badge, city, and status indicator.
- Automatically stores selection in `localStorage` under `restro_active_location_id` and `restro_active_tenant_id`.
- Automatically attaches `x-location-id` and `x-target-tenant-id` to every outgoing Axios/Fetch request via `apiClient`.
- Invalidates TanStack Query cache (`queryClient.invalidateQueries()`) upon switching, guaranteeing immediate refresh of tables, rooms, orders, and KDS for the new branch.

### 6.2 Super Admin Franchise Management Screens
1. **Catalog (`/admin/franchises`)**: Searchable list of all franchise organizations, location counts, and status filters.
2. **5-Step Onboarding Wizard (`/admin/franchises/new`)**:
   - Step 1: Corporate Details (Name, unique code, legal name, contact).
   - Step 2: Brand Configuration (Logo, theme colors, hospitality modules).
   - Step 3: First Operational Location (Address, city, timezone, currency, tax).
   - Step 4: Franchise Owner Account Provisioning (Name, email, temporary credentials).
   - Step 5: Summary Review & Atomic Provisioning.
3. **Franchise Detail (`/admin/franchises/[id]`)**: Aggregated metrics grouped by currency, location table, and owner roster.

### 6.3 Operational Location Management Screens
1. **Locations Fleet (`/admin/locations`)**: Grid and list view of all locations with live table, room, and order counters.
2. **Add Location (`/admin/locations/new`)**: Direct creation of independent businesses or additional branches for existing franchises.
3. **Location Detail & Controls (`/admin/locations/[id]`)**: Live operational counters, editable location settings, staff assignment, and suspension controls.

---

## 7. Zero Demo Data Guarantee

In production runtime:
`NEXT_PUBLIC_USE_MOCK_API=false`

1. When a new franchise or independent location is onboarded, it starts with **ZERO** fake business records:
   - 0 Dining Tables
   - 0 Hotel Rooms
   - 0 Menu Categories & Dishes
   - 0 Orders & KOTs
   - 0 Invoices & Payments
   - 0 Seeded Demo Employees
2. All dashboard metrics, occupancy rates, and revenue tallies reflect **genuine database records** in PostgreSQL.
3. Mock APIs remain isolated strictly to development mock services and are never invoked during standard runtime.
