# SCULPX E-Billing — VPS Integration & Deployment Handover

> **Audience**: Backend Developer, VPS System Administrator, DevOps  
> **Topic**: Production Connectivity Requirements, Reverse Proxy, CORS, WSS Upgrades  

---

## 1. What the Frontend Requires from the VPS

The frontend is ready to communicate with your backend services deployed on the VPS. To ensure smooth integration, the frontend requires the following parameters from the backend developer:

```text
1. Public API Base URL:      e.g., https://api.yourdomain.com/api/v1
2. WebSocket Endpoint:       e.g., wss://api.yourdomain.com/ws
3. Frontend Domain (CORS):   e.g., https://pos.yourdomain.com
4. Health Check Endpoint:    e.g., https://api.yourdomain.com/health
```

---

## 2. Nginx / Caddy Reverse Proxy Configuration

The VPS reverse proxy should forward REST API requests and upgrade WebSocket connections cleanly:

### Recommended Nginx Server Block:

```nginx
# Upstream Node.js API Server
upstream nodejs_backend {
    server 127.0.0.1:8000;
    keepalive 64;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL Certificate Configuration (Let's Encrypt / Certbot)
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # CORS Headers Configuration
    add_header 'Access-Control-Allow-Origin' 'https://pos.yourdomain.com' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PATCH, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, Accept, Idempotency-Key' always;

    # Pre-Flight CORS Handling
    if ($request_method = 'OPTIONS') {
        return 204;
    }

    # REST API Reverse Proxy
    location /api/ {
        proxy_pass http://nodejs_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 10M;
    }

    # WebSocket Upgrade Proxy
    location /ws {
        proxy_pass http://nodejs_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }

    # Health Check Endpoint
    location /health {
        proxy_pass http://nodejs_backend;
        access_log off;
    }
}
```

---

## 3. CORS & Allowed Origins

The Node.js backend on the VPS must configure CORS middleware (e.g. `cors` package):

```javascript
const cors = require('cors');

const allowedOrigins = [
  'https://pos.yourdomain.com', // Production Frontend
  'http://localhost:3000',      // Local Dev Frontend
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Blocked by CORS policy'));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Idempotency-Key'],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
}));
```

---

## 4. Action Items for Backend Developer

Please supply the following verified values to the frontend team:

- [ ] **Production API Base URL**: `_________________________________`
- [ ] **Production WebSocket URL**: `_________________________________`
- [ ] **Health Endpoint URL**: `_________________________________`
- [ ] **CORS Origin Whitelist verified** for frontend domain.
- [ ] **SSL/TLS active** with valid HTTPS/WSS certificates.
- [ ] **PM2 / systemd service auto-restart** configured for Node.js process.
