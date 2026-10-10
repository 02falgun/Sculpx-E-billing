# SCULPX E-Billing — Fastify & Prisma Backend

Production-grade Fastify and Prisma ORM backend service for the SCULPX Hospitality & Restaurant E-Billing platform, connected to Supabase PostgreSQL.

---

## 1. Stack & Architecture

- **Runtime & Language**: Node.js (v22+) & TypeScript (v5.7+ / ES2022 NodeNext)
- **Framework**: [Fastify](https://fastify.dev/) v5 (Express is strictly prohibited)
- **Database & ORM**: PostgreSQL (hosted on Supabase) via [Prisma ORM](https://www.prisma.io/) v6
- **Configuration**: Runtime schema validation via [Zod](https://zod.dev/)
- **Logging**: Structured JSON logging via [Pino](https://getpino.io/) with automatic credential and header redaction (`pino-pretty` in dev)
- **Testing**: Automated testing via [Vitest](https://vitest.dev/) with `fastify.inject` (zero port binding required for test runs)

---

## 2. Directory Structure

```
backend/
├── prisma/
│   └── schema.prisma         # Hospitality entity data models (aligned with docs/DATA_MODELS.md)
├── src/
│   ├── config/
│   │   ├── env.ts            # Validated environment loader with Zod
│   │   └── index.ts          # Config exports
│   ├── lib/
│   │   ├── errors.ts         # Standard API response envelopes & error handlers
│   │   ├── logger.ts         # Structured logging configuration with redaction
│   │   └── prisma.ts         # Singleton Prisma client & DB health check helper
│   ├── routes/
│   │   ├── health.ts         # GET /api/health and GET /api/ready endpoints
│   │   └── index.ts          # API route registration
│   ├── app.ts                # Fastify factory function (buildApp)
│   └── server.ts             # Process lifecycle, port listener, and graceful shutdown
├── tests/
│   ├── health.test.ts        # Automated liveness & request-id tests
│   └── ready.test.ts         # Automated database readiness & failure recovery tests
├── .env.example              # Placeholder environment variable template
├── package.json              # Backend scripts and dependencies
├── tsconfig.json             # TypeScript configuration
└── vitest.config.ts          # Vitest test runner configuration
```

---

## 3. Environment Configuration

Copy `.env.example` to `.env` or `.env.local` inside `backend/`:

```bash
cp .env.example .env
```

### Supported Variables

| Variable | Type | Default | Description |
|---|---|---|---|
| `PORT` | Number | `8000` | Port for the HTTP server |
| `HOST` | String | `0.0.0.0` | Host interface to bind |
| `NODE_ENV` | String | `development` | Environment (`development`, `test`, `production`) |
| `LOG_LEVEL` | String | `info` | Logging verbosity (`info`, `debug`, `warn`, `error`, `silent`) |
| `CORS_ORIGIN` | String | `http://localhost:3000` | Allowed CORS origins (comma-separated or `*`) |
| `DATABASE_URL` | String | — | Supabase PostgreSQL pooled connection URL (`:6543`) |
| `DATABASE_URL` | String | — | Supabase PostgreSQL pooled connection URL (`:6543`) |
| `DIRECT_URL` | String | — | Supabase PostgreSQL direct session URL (`:5432`) |
| `JWT_SECRET` | String | Required in prod (min 32 chars) | Cryptographic signing secret for Fastify JWT tokens |
| `JWT_EXPIRES_IN` | String | `8h` | Token expiration duration (shift-based) |
| `DEMO_SEED_PASSWORD` | String | `demo-secure-pass` | Default password used when running development seed script |
| `ALLOW_DEMO_SEED` | Boolean | `true` (dev/test) | Security guard preventing demo account seeding in production |
| `RATE_LIMIT_MAX` | Number | `10` | Maximum requests per IP window on sensitive endpoints like `/login` |
| `RATE_LIMIT_WINDOW_MS` | Number | `60000` | Rate limiting sliding window in milliseconds (1 min) |

> **Note on Supabase Connection**:  
> In Supabase, `DIRECT_URL` connects to port `5432` for direct execution and migrations. When connection pooling on port `6543` is unreachable or unconfigured, the application client automatically utilizes `DIRECT_URL` to maintain uninterrupted database operations.

---

## 4. Development & Operating Scripts

From the `backend/` directory:

```bash
# Install dependencies
npm install

# Validate Prisma schema
npm run prisma:validate

# Generate Prisma Client
npm run prisma:generate

# Apply pending database migrations to PostgreSQL
npx prisma migrate deploy

# Seed demo staff accounts (idempotent; development only)
npm run db:seed

# Start in development mode with live watch
npm run dev

# Run TypeScript type check
npm run typecheck

# Run automated tests
npm test

# Build for production
npm run build

# Start production server
npm start
```

---

## 5. Endpoints & API Contracts

### `GET /api/health`
- **Purpose**: Liveness probe confirming that the Fastify process is running and responding to HTTP traffic.
- **Status**: `200 OK`
- **Aliases**: `/health`, `/api/v1/health`

### `GET /api/ready`
- **Purpose**: Readiness probe executing a lightweight query (`SELECT 1`) against the Supabase PostgreSQL database.
- **Status**: `200 OK` when connected, `503 Service Unavailable` on outage.
- **Aliases**: `/ready`, `/api/v1/ready`

### `POST /api/v1/auth/login`
- **Purpose**: Authenticates employee credentials, verifies active status, and issues signed JWT Bearer tokens.
- **Security**: Rate limited (`@fastify/rate-limit`), bcrypt password verification, generic failure message preventing email enumeration.
- **Accepts**: `{ "email": "admin@demo.com", "password": "demo-secure-pass" }` (or `pinOrPassword`).
- **Success (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "e1b1d1f0-...",
      "tenantId": "e1b1d1f0-0000-4000-8000-000000000001",
      "name": "Rajesh Sharma",
      "email": "admin@demo.com",
      "role": "ADMIN",
      "phoneNumber": "+91 98765 43210",
      "isActive": true,
      "permissions": ["all_admin", "manage_menu", "manage_printers"]
    },
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "expiresAt": "2026-10-11T03:26:09.000Z"
  },
  "message": "Login successful"
}
```

### `GET /api/v1/auth/me`
- **Purpose**: Retrieves currently authenticated employee profile and active permissions from database.
- **Security**: Requires `Authorization: Bearer <token>`, verifies active status, rejects revoked/disabled users.
- **Success (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "id": "e1b1d1f0-...",
    "tenantId": "e1b1d1f0-0000-4000-8000-000000000001",
    "name": "Rajesh Sharma",
    "email": "admin@demo.com",
    "role": "ADMIN",
    "phoneNumber": "+91 98765 43210",
    "isActive": true,
    "permissions": ["all_admin", "manage_menu"]
  }
}
```

### `POST /api/v1/auth/logout`
- **Purpose**: Terminates employee session.
- **Security**: Bearer token required.

### Menu Catalog Endpoints (`/api/v1/menu`)
- **Role Requirement**: Read (`GET`) allowed for all authenticated staff; Write/Mutation (`POST`, `PATCH`, `DELETE`) strictly requires `ADMIN` or `SUPER_ADMIN`.
- **Tenant Isolation**: All queries/mutations scoped to the tenant of the authenticated staff member. Foreign categories or items return HTTP 404/400.
- **Categories**:
  - `GET /api/v1/menu/categories` (supports `?includeInactive=true`)
  - `GET /api/v1/menu/categories/:id`
  - `POST /api/v1/menu/categories`
  - `PATCH /api/v1/menu/categories/:id`
  - `DELETE /api/v1/menu/categories/:id` (safely soft-deactivates if items exist)
- **Menu Items**:
  - `GET /api/v1/menu/items` (supports `?page=1&limit=20&categoryId=...&dietaryType=...&isAvailable=...&search=...`)
  - `GET /api/v1/menu/items/:id` (includes modifier groups and options hierarchy)
  - `POST /api/v1/menu/items` (creates item with authoritative decimal prices and optional nested modifier groups)
  - `PATCH /api/v1/menu/items/:id`
  - `DELETE /api/v1/menu/items/:id` (safely soft-deactivates if historical orders/bills exist)
- **Modifier Groups & Options Sub-routes**:
  - `POST /api/v1/menu/items/:itemId/modifier-groups`
  - `PATCH /api/v1/menu/modifier-groups/:groupId`
  - `DELETE /api/v1/menu/modifier-groups/:groupId`
  - `POST /api/v1/menu/modifier-groups/:groupId/options`
  - `PATCH /api/v1/menu/modifier-options/:optionId`
  - `DELETE /api/v1/menu/modifier-options/:optionId`

---

## 6. Demo Accounts & Role Authorization Matrix

The database contains seven pre-seeded demonstration staff accounts (all passwords read from `DEMO_SEED_PASSWORD`, default: `demo-secure-pass`):

| Email | Role | Staff Name | Workspace Access |
|---|---|---|---|
| `superadmin@demo.com` | `SUPER_ADMIN` | Kavya Kumar (Owner) | Multi-property administration, audit logs, system config |
| `admin@demo.com` | `ADMIN` | Rajesh Sharma | `/admin` (Catalog, tables, printers, inventory, settings) |
| `manager@demo.com` | `MANAGER` | Vikram Mehta | `/manager` (Live operations, overrides, audits, reports) |
| `captain@demo.com` | `CAPTAIN` | Karan Verma | `/staff` (Floor captain, order escalations, table status) |
| `waiter@demo.com` | `WAITER` | Rahul Sharma | `/staff` (Table orders, live statuses, bill requests) |
| `cashier@demo.com` | `CASHIER` | Pooja Verma | `/cashier` (Ledger, settlements, UPI/Card payments, receipts) |
| `kitchen@demo.com` | `KITCHEN_STAFF` | Chef Sanjeev | `/kitchen` (KDS board, ticket progression, timers) |

---

## 7. Next Implementation Steps (Phase 3B)

1. Public QR token resolution (`GET /api/v1/public/qr-context/:token`) for physical table and room mapping.
2. Order cart validation (`POST /api/v1/orders/validate`) with server-side tax (CGST + SGST) re-computation.
3. Order placement (`POST /api/v1/orders`) with idempotency key deduplication.
4. Kitchen Order Ticket (KOT) station routing and progression.
5. Bill generation, split billing, and payment records.

