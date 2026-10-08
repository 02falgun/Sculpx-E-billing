# Contributing & Phase Gate Workflows

## 1. Phase Gate Process
Every phase in the development roadmap must strictly pass all verification checks before any work on subsequent phases can proceed:

1. `npm run lint` — Zero ESLint warnings or errors.
2. `npm run typecheck` — Zero TypeScript compilation errors (`tsc --noEmit`).
3. `npm run test` — All unit and component tests passing.
4. `npm run build` — Production Next.js build succeeding cleanly.
5. Documentation updated to reflect active code.
6. Architectural decisions recorded in `docs/adr/`.

---

## 2. Commit Standards
Follow Conventional Commits:
- `feat(cart): implement quantity controls and modifier calculator`
- `fix(kitchen): fix status race condition on double tap`
- `docs(api): update contract for bill discount endpoint`
- `test(order): add validation tests for zero-item payload`
- `chore(deps): update packages`
