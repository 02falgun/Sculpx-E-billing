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

