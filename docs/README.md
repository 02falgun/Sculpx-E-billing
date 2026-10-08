# Hotel Restaurant QR E-Billing Platform — Frontend Architecture

Welcome to the **Hotel Restaurant QR E-Billing & Operations Frontend** documentation. This system is designed as an enterprise-grade, high-performance, real-time web application built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **TanStack Query**, **Zustand**, and **WebSockets**.

---

## 📖 Documentation Index

| Category | Document | Description |
| :--- | :--- | :--- |
| **Overview** | [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) | Business goals, core personas, scope & boundaries |
| **Architecture** | [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) | High-level system design & service interaction diagrams |
| **Architecture** | [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md) | Layered UI architecture, data flow & module hierarchy |
| **User Flows** | [USER_FLOWS.md](./USER_FLOWS.md) | Comprehensive overview of all operational personas |
| **User Flows** | [CUSTOMER_FLOW.md](./CUSTOMER_FLOW.md) | QR scan, menu browsing, cart, checkout & e-bill flow |
| **User Flows** | [STAFF_FLOW.md](./STAFF_FLOW.md) | POS, floor tables, walk-in orders & bill settlement |
| **User Flows** | [KITCHEN_FLOW.md](./KITCHEN_FLOW.md) | Real-time Kitchen Display System (KDS) & KOT lifecycle |
| **User Flows** | [ADMIN_FLOW.md](./ADMIN_FLOW.md) | Menu, inventory, room/table QR, user & printer management |
| **Contracts** | [API_CONTRACT.md](./API_CONTRACT.md) | REST endpoints, request/response envelopes & payloads |
| **Contracts** | [WEBSOCKET_CONTRACT.md](./WEBSOCKET_CONTRACT.md) | Real-time event schemas, connection lifecycle & topics |
| **Data & Routing**| [DATA_MODELS.md](./DATA_MODELS.md) | Canonical TypeScript models and entity relationships |
| **Data & Routing**| [ROUTES.md](./ROUTES.md) | Complete application route matrix & access permissions |
| **Implementation**| [COMPONENT_ARCHITECTURE.md](./COMPONENT_ARCHITECTURE.md) | Design system, atomic components & domain widgets |
| **Implementation**| [STATE_MANAGEMENT.md](./STATE_MANAGEMENT.md) | TanStack Query (server) vs Zustand (client) strategy |
| **Governance** | [CODING_RULES.md](./CODING_RULES.md) | Standards, anti-patterns & strict TypeScript rules |
| **Quality** | [PERFORMANCE.md](./PERFORMANCE.md) | Core Web Vitals, caching, bundle budgets & virtualization |
| **Quality** | [SECURITY.md](./SECURITY.md) | Session security, sanitization, zero-trust frontend rules |
| **Quality** | [ERROR_HANDLING.md](./ERROR_HANDLING.md) | Error boundaries, fallback states & network resilience |
| **Quality** | [TESTING.md](./TESTING.md) | Vitest, React Testing Library & Playwright E2E strategy |
| **Platform** | [PWA.md](./PWA.md) | Progressive Web App manifest, service worker & caching |
| **Operations** | [ENVIRONMENT.md](./ENVIRONMENT.md) | Environment configuration variables & toggles |
| **Operations** | [DEPLOYMENT.md](./DEPLOYMENT.md) | CI/CD pipelines, containerization & edge deployment |
| **Integration** | [BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md) | Mock-to-production backend cutover instructions |
| **Integration** | [PRINTER_INTEGRATION.md](./PRINTER_INTEGRATION.md) | Thermal KOT and bill printer queue architecture |
| **Standards** | [ACCESSIBILITY.md](./ACCESSIBILITY.md) | WCAG 2.1 AA compliance, keyboard navigation & ARIA |
| **Collaboration**| [CONTRIBUTING.md](./CONTRIBUTING.md) | Branching guidelines, phase gates & commit standards |
| **History** | [CHANGELOG.md](./CHANGELOG.md) | Version history and phase release notes |
| **Decisions** | [adr/](./adr/) | Architecture Decision Records (ADRs) |

---

## 🏛️ Quick Start

```bash
# Install dependencies
npm install

# Run development server (runs with mock API by default)
npm run dev

# Run TypeScript typecheck
npm run typecheck

# Run unit and component tests
npm run test

# Run build verification
npm run build
```
