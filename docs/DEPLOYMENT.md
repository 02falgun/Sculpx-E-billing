# Deployment & Build Pipeline

## 1. Production Build Requirements
To produce a verified production build:
```bash
# 1. Typecheck
npm run typecheck

# 2. Linting
npm run lint

# 3. Unit & Component Tests
npm run test

# 4. Production Next.js Bundle
npm run build
```

---

## 2. Target Deployment Topologies
1. **Edge / Vercel / Cloudflare Pages**:
   - Ideal for customer-facing QR menus and global CDN caching of static assets.
2. **Containerized (Docker / Kubernetes)**:
   - For internal hotel on-premise private clouds or AWS ECS.
   - Leverages Next.js `output: 'standalone'` for lightweight production containers.

---

## 3. Cache Invalidation at Deploy Time
- Static assets receive content-hashed URLs (`/_next/static/...`), guaranteeing zero asset skew across new version releases.
- Next.js ISR (Incremental Static Regeneration) or revalidate tags are leveraged for infrequently updated menu structures.
