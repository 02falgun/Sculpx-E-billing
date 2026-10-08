# Frontend Security Principles

## 1. Zero-Trust Frontend Rule
> **Never trust the client.**
> Frontend validation exists exclusively to provide immediate, delightful user feedback. It is never treated as an authorization or security boundary.

- The client can NEVER authorize pricing changes, discounts, payment completions, or inventory allocations.
- All final computations (taxes, round-offs, bill totals) are recalculated and signed by the authoritative backend.

---

## 2. Sensitive Data & Secret Hygiene
- **Zero Secrets in Frontend**: `NEXT_PUBLIC_*` environment variables are strictly limited to public configuration (API endpoint URLs, WS URLs, public branding).
- **No API Keys**: Never embed Stripe secret keys, database credentials, or server-to-server tokens in the client bundle.
- **Credential Storage**: Auth tokens are stored in `httpOnly`, `Secure`, `SameSite=Strict` cookies whenever supported by backend response headers, mitigating XSS exfiltration risks.

---

## 3. Injection & XSS Mitigations
- **Safe Rendering**: Never use `dangerouslySetInnerHTML` for user-generated content (such as customer names, item notes, or special instructions).
- **Content Security Policy (CSP)**: The Next.js headers configuration restricts script execution, external frame embedding, and WebSocket origin connections to trusted domains.
- **Input Sanitization**: All text inputs (special instructions, notes) are sanitized and length-capped via Zod schemas prior to dispatch.

---

## 4. Session Expiration & Route Protection
- Protected routes (`/pos`, `/kitchen`, `/admin`, `/billing`) verify session tokens via Next.js Middleware and client-side auth guards.
- If an API request returns `401 Unauthorized`, the client intercepts the response, flushes the auth state, and redirects the user to `/login` with a `redirectTo` query parameter.
