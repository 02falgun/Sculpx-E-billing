# SCULPX E-Billing — Environment Configuration & Deployment Setup

> **Audience**: DevOps Engineer, Backend Developer, Local Frontend Contributor  
> **Topic**: Environment Variables, VPS Configuration, Local vs Production Modes  

---

## 1. Environment Variable Reference

All frontend environment variables use the `NEXT_PUBLIC_` prefix to be available in client-side bundles:

| Variable Name | Required in Prod? | Default (Local Dev) | Production Example | Description |
|---|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | **YES** | `http://localhost:8000/api/v1` | `https://api.grandpalace.com/api/v1` | Base REST API URL consumed by `ApiClient`. |
| `NEXT_PUBLIC_WS_URL` | **YES** | `ws://localhost:8000/ws` | `wss://api.grandpalace.com/ws` | WebSocket endpoint for real-time event bus. |
| `NEXT_PUBLIC_APP_URL` | **YES** | `http://localhost:3000` | `https://pos.grandpalace.com` | Canonical frontend domain for QR generation. |
| `NEXT_PUBLIC_USE_MOCK_API` | **YES** | `true` | `false` | When `false`, frontend calls live backend APIs. |
| `NEXT_PUBLIC_APP_NAME` | NO | `SCULPX E-Billing` | `The Grand Royal Palace & Resort` | Property brand name shown on login and receipts. |
| `NEXT_PUBLIC_CURRENCY_SYMBOL` | NO | `₹` | `₹` | Currency symbol used across catalog and bills. |
| `NEXT_PUBLIC_CURRENCY_CODE` | NO | `INR` | `INR` | ISO 4217 currency code. |

---

## 2. Setting Up Local Development

### Step 1: Copy Environment Template
```bash
cp .env.example .env.local
```

### Step 2: Running in Mock Mode (Default)
When developing frontend UI or running offline tests without the Node.js backend:
```ini
NEXT_PUBLIC_USE_MOCK_API=true
```
- The frontend will utilize its self-contained mock service layer (`src/services/api/mock/`) and simulated WebSocket connection.
- Demo logins (`admin@demo.com`, `waiter@demo.com`, etc.) will authenticate instantly in-memory.

### Step 3: Running Against Local Live Backend
When developing alongside your local Node.js + PostgreSQL server:
```ini
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_USE_MOCK_API=false
```

---

## 3. Configuring for Production VPS

When building and deploying the frontend to run against the configured VPS:

```ini
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api/v1
NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com/ws
NEXT_PUBLIC_APP_URL=https://pos.yourdomain.com
NEXT_PUBLIC_USE_MOCK_API=false
NEXT_PUBLIC_APP_NAME="The Grand Royal Palace"
NEXT_PUBLIC_CURRENCY_SYMBOL="₹"
NEXT_PUBLIC_CURRENCY_CODE="INR"
```

### Production Security Checklist:
- [x] Zero database credentials (`PGUSER`, `PGPASSWORD`, etc.) are exposed in frontend code or bundles.
- [x] Zero private keys or gateway secret keys are in `NEXT_PUBLIC_*` variables.
- [x] `NEXT_PUBLIC_USE_MOCK_API` is set to `false`.
- [x] Production URLs utilize secure HTTPS and WSS protocols.
- [x] Canonical `NEXT_PUBLIC_APP_URL` is set to the official production domain to ensure printed QR codes resolve correctly.

---

## 4. Cloud-to-Printer Network Deployment Architecture

### 4.1 Strict Invariant: Zero Public Raw TCP Ports
Raw printer TCP port 9100 must **NEVER** be port-forwarded, NAT-exposed, or reachable over the public internet. Thermal printers have no authentication, encryption, or hardened TCP stacks; exposing port 9100 exposes hardware to Denial of Service, unauthorized buffer dumping, and paper exhaustion.

### 4.2 Architecture Options for Production Venues

#### Option A: On-Premise Fastify Server (Single Venue)
- **Deployment**: Backend runs on a dedicated POS server / Mac mini / Linux terminal on the restaurant LAN (`192.168.1.50`).
- **Communication**: Fastify's `NetworkEscPosAdapter` establishes direct TCP socket connections to thermal printers at `192.168.1.200:9100`.
- **Latency**: Sub-millisecond; zero cloud internet dependency for physical ticket printing.

#### Option B: Cloud VPS with Site-to-Site VPN Tunnel (Recommended for Multi-Location)
- **Deployment**: Backend runs on Cloud VPS (AWS/DigitalOcean/Hetzner). Venue router or dedicated on-premise gateway runs WireGuard or Tailscale.
- **Topology**: VPS communicates over private encrypted overlay interface (`wg0` or `tailscale0` subnet `10.8.0.0/24`).
- **Routing**: Static route routes printer subnet (`192.168.1.0/24`) through the secure tunnel.
- **Security**: Only the Cloud VPS can route to the printer subnet; zero inbound public IP exposure.

#### Option C: Cloud VPS with Outbound Local Print Gateway Agent
- **Deployment**: A lightweight Node.js/Go print agent runs on the cashier terminal or a Raspberry Pi within the restaurant LAN.
- **Outbound Connection**: The agent initiates an authenticated, outbound WSS/HTTPS connection to Cloud Fastify (`wss://api.yourdomain.com/ws/gateway` or polling).
- **Authentication**: Venue-scoped API Key or mTLS certificate passed in handshake headers. Never exposed to browser bundles.
- **Dispatch**: Backend generates ESC/POS binary buffers and pushes them to the connected gateway. The gateway spools them locally to LAN TCP or USB printers (`/dev/usb/lp0`).
- **Advantage**: Requires zero router firewall changes or public static IP at the restaurant.

---

## 5. V1 Web Pilot Execution (Printerless Live Mode)

For the V1 controlled pilot (10–15 concurrent customer dining sessions + multi-role staff operations):

### 5.1 Operating Parameters
- **Runtime Mocks**: Disabled (`NEXT_PUBLIC_USE_MOCK_API=false`).
- **Data Persistence**: Live Supabase PostgreSQL database.
- **Printer Hardware**: Strictly **Printerless Mode**. Hardware printers are not connected. Print jobs are created as durable database intents and spooled in the background; hardware connection timeouts gracefully back off and log warnings without aborting order placements, KOT progressions, or tax bill settlements.

### 5.2 Pilot Internal Staff Accounts (`@ebilling.com`)
All internal pilot test staff accounts are seeded and ready:

| Role | Email | Password / PIN | Scope / Access Area |
|---|---|---|---|
| `SUPER_ADMIN` | `superadmin@ebilling.com` | `demo-secure-pass` | Complete platform governance & audit ledger |
| `ADMIN` | `admin@ebilling.com` | `demo-secure-pass` | Back-Office (`/admin`), Menu Catalog, Printers, QR Tent Cards |
| `MANAGER` | `manager@ebilling.com` | `demo-secure-pass` | Shift management, void authorizations, discount overrides |
| `CAPTAIN` | `captain@ebilling.com` | `demo-secure-pass` | Floor management, table assignment, service escalations |
| `WAITER` | `waiter@ebilling.com` | `demo-secure-pass` | Waiter POS (`/pos`), Table Floor (`/tables`), Bill requests |
| `CASHIER` | `cashier@ebilling.com` | `demo-secure-pass` | Central Billing Desk (`/billing`), GST invoices, UPI/Cash settlement |
| `KITCHEN_STAFF` | `kitchenstaff@ebilling.com` | `demo-secure-pass` | Paperless Touchscreen KDS (`/kitchen`), KOT lifecycle progression |

*(Legacy demonstration accounts under `@demo.com` remain supported for backward-compatible staging scripts.)*

### 5.3 Canonical Pilot Dining QR Tokens
10 Tables and 3 Rooms are pre-seeded with active QR tokens:
- **Tables (1 to 10)**: `table-token-1`, `table-token-2`, `table-token-3`, `table-token-4`, `table-token-5`, `table-token-6`, `table-token-7`, `table-token-8`, `table-token-9`, `table-token-10`
- **Rooms (101, 301, 302)**: `room-token-101`, `room-token-301`, `room-token-302`

Direct customer QR URL format:
`http://localhost:3000/menu/table-token-1`

---

## 6. Future Organizational Hosting Recommendations

When moving from local pilot execution to cloud hosting:

### Frontend Hosting: Vercel / Cloudflare Pages
- **Recommended**: Deploy the Next.js frontend (`/`) to **Vercel** or **Cloudflare Pages**.
- **Configuration**:
  - Set `NEXT_PUBLIC_API_URL` to the public backend domain (e.g. `https://api.yourdomain.com/api/v1`).
  - Set `NEXT_PUBLIC_WS_URL` to the public WebSocket domain (e.g. `wss://api.yourdomain.com/ws`).
  - Set `NEXT_PUBLIC_USE_MOCK_API=false`.
- **Note**: Next.js App Router static pages, SSR routes, and client assets excel on Vercel's global CDN edge.

### Backend Hosting: Containerized Persistent Host (NOT Serverless)
- **Important**: The Fastify backend (`backend/`) MUST NOT be deployed to serverless environments (like AWS Lambda or Vercel Serverless Functions) because:
  1. It runs a persistent in-process WebSocket connection registry (`/ws`) for instant real-time KDS and POS updates.
  2. It runs persistent background daemons: the Transactional Outbox worker (every 2s) and the Print Queue Spooler (every 3s).
  3. Serverless functions freeze execution when idle, terminating active WebSockets and pausing queue workers.
- **Recommended Backend Hosts**:
  - Container-based PaaS: **Fly.io**, **Railway**, **Render**, or **AWS ECS / Fargate**.
  - Dedicated VPS / VM: **Ubuntu 24.04 LTS** on Hetzner, DigitalOcean, or AWS EC2 running Docker Compose or PM2 with an Nginx reverse proxy.

