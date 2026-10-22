import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DEMO_USERS,
  getDefaultRouteForRole,
  canAccess,
  mockAuthenticate,
  isSessionExpired,
  sanitizeRedirect,
} from "@/utils/auth";
import { useAuthStore } from "@/store/authStore";

describe("Section 17: Authentication & Routing Security Test Matrix", () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  it("Matrix 1: Unauthenticated user opens /login -> login destination is permitted and no session exists", () => {
    expect(canAccess(null, "/login")).toBe(true);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().session).toBeNull();
  });

  it("Matrix 2: Valid Super Admin opens /login -> resolves to Super Admin dashboard /admin", () => {
    const session = mockAuthenticate(DEMO_USERS.superadmin.user.email);
    expect(session).not.toBeNull();
    const destination = sanitizeRedirect(null, session!.user.role);
    expect(destination).toBe("/admin");
    expect(canAccess(session!.user, "/admin")).toBe(true);
    expect(canAccess(session!.user, "/admin/franchises")).toBe(true);
  });

  it("Matrix 3: Valid Location Admin opens /login -> resolves to Location Admin dashboard /admin", () => {
    const session = mockAuthenticate(DEMO_USERS.admin.user.email);
    expect(session).not.toBeNull();
    const destination = sanitizeRedirect(null, session!.user.role);
    expect(destination).toBe("/admin");
    expect(canAccess(session!.user, "/admin")).toBe(true);
  });

  it("Matrix 4: Valid Kitchen Staff opens /login -> resolves to Kitchen destination /kitchen", () => {
    const session = mockAuthenticate(DEMO_USERS.kitchen.user.email);
    expect(session).not.toBeNull();
    const destination = sanitizeRedirect(null, session!.user.role);
    expect(destination).toBe("/kitchen");
    expect(canAccess(session!.user, "/kitchen")).toBe(true);
    expect(canAccess(session!.user, "/admin")).toBe(false);
  });

  it("Matrix 5: Valid Cashier opens /login -> resolves to Cashier billing destination /cashier", () => {
    const session = mockAuthenticate(DEMO_USERS.cashier.user.email);
    expect(session).not.toBeNull();
    const destination = sanitizeRedirect(null, session!.user.role);
    expect(destination).toBe("/cashier");
    expect(canAccess(session!.user, "/cashier")).toBe(true);
    expect(canAccess(session!.user, "/admin")).toBe(false);
  });

  it("Matrix 6: Expired session opens protected route -> expired detection marks session as invalid", () => {
    const expiredSession = {
      user: DEMO_USERS.admin.user,
      token: "jwt-expired-token",
      expiresAt: new Date(Date.now() - 1000 * 60).toISOString(),
    };
    expect(isSessionExpired(expiredSession)).toBe(true);

    useAuthStore.getState().setSession(expiredSession);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    // Expired detection clears invalid state
    if (isSessionExpired(useAuthStore.getState().session)) {
      useAuthStore.getState().clearSession();
    }
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().session).toBeNull();
  });

  it("Matrix 7: Revoked session -> clears session cleanly", () => {
    const session = mockAuthenticate(DEMO_USERS.manager.user.email)!;
    useAuthStore.getState().setSession(session);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    // Revocation triggers clearSession
    useAuthStore.getState().clearSession();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it("Matrix 8: Authenticated user opens another role's route -> unauthorized access blocked", () => {
    const waiter = DEMO_USERS.waiter.user;
    const cashier = DEMO_USERS.cashier.user;
    const kitchen = DEMO_USERS.kitchen.user;

    expect(canAccess(waiter, "/admin")).toBe(false);
    expect(canAccess(waiter, "/cashier")).toBe(false);
    expect(canAccess(waiter, "/kitchen")).toBe(false);

    expect(canAccess(cashier, "/admin")).toBe(false);
    expect(canAccess(cashier, "/kitchen")).toBe(false);

    expect(canAccess(kitchen, "/admin")).toBe(false);
    expect(canAccess(kitchen, "/cashier")).toBe(false);
  });

  it("Matrix 9: Unauthenticated user enters protected URL directly -> fallback to role route or sanitized redirect", () => {
    // Unauthenticated user attempting to access /admin
    expect(canAccess(null, "/admin")).toBe(false);
    expect(canAccess(null, "/staff")).toBe(false);
    expect(canAccess(null, "/kitchen")).toBe(false);
    expect(canAccess(null, "/cashier")).toBe(false);

    // Valid internal relative path is preserved for post-login redirect
    expect(sanitizeRedirect("/admin", null)).toBe("/admin");
    // Invalid external URL falls back to /login when no role is present
    expect(sanitizeRedirect("https://attacker.site", null)).toBe("/login");
  });

  it("Matrix 10: Valid session refreshes protected page -> access remains consistent and valid", () => {
    const session = mockAuthenticate(DEMO_USERS.admin.user.email)!;
    useAuthStore.getState().setSession(session);

    // Session is valid and not expired
    expect(isSessionExpired(useAuthStore.getState().session)).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(canAccess(useAuthStore.getState().user, "/admin")).toBe(true);
  });

  it("Matrix 11: User logs out -> session cleared and protected access removed", () => {
    const session = mockAuthenticate(DEMO_USERS.admin.user.email)!;
    useAuthStore.getState().setSession(session);
    expect(useAuthStore.getState().isAuthenticated).toBe(true);

    useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().session).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(canAccess(useAuthStore.getState().user, "/admin")).toBe(false);
  });

  it("Matrix 12: Redirect loop prevention and open redirect hardening", () => {
    // Direct /login redirect loop prevented
    expect(sanitizeRedirect("/login", "ADMIN")).toBe("/admin");
    expect(sanitizeRedirect("/login?redirect=/admin", "ADMIN")).toBe("/admin");

    // Open redirects blocked
    expect(sanitizeRedirect("https://attacker.site/steal", "ADMIN")).toBe("/admin");
    expect(sanitizeRedirect("//attacker.site", "ADMIN")).toBe("/admin");
    expect(sanitizeRedirect("javascript:alert(1)", "ADMIN")).toBe("/admin");

    // Unauthorized deep link falls back to authorized role workspace
    expect(sanitizeRedirect("/admin/audit", "WAITER")).toBe("/staff");
  });

  it("Matrix 13: User changes role or permissions -> store updateUser updates role immediately", () => {
    const initialSession = mockAuthenticate(DEMO_USERS.waiter.user.email)!;
    useAuthStore.getState().setSession(initialSession);
    expect(useAuthStore.getState().user?.role).toBe("WAITER");

    // Live promotion to MANAGER
    const updatedUser = {
      ...initialSession.user,
      role: "MANAGER" as const,
      permissions: [...(initialSession.user.permissions || []), "view_operations"],
    };
    useAuthStore.getState().updateUser(updatedUser);

    expect(useAuthStore.getState().user?.role).toBe("MANAGER");
    expect(useAuthStore.getState().session?.user.role).toBe("MANAGER");
    expect(canAccess(useAuthStore.getState().user, "/manager")).toBe(true);
  });

  it("Matrix 14: Customer QR routes open without staff login", () => {
    // Public customer menus, cart, checkout, order tracking, and receipt bills do not require staff session
    expect(canAccess(null, "/menu/table/tbl-1")).toBe(true);
    expect(canAccess(null, "/menu/room/rm-101")).toBe(true);
    expect(canAccess(null, "/cart")).toBe(true);
    expect(canAccess(null, "/checkout")).toBe(true);
    expect(canAccess(null, "/order/ord-123")).toBe(true);
    expect(canAccess(null, "/bill/bill-123")).toBe(true);
  });

  it("Matrix 15: Super Admin has superuser authority across all workspaces", () => {
    const superAdmin = DEMO_USERS.superadmin.user;
    expect(canAccess(superAdmin, "/admin")).toBe(true);
    expect(canAccess(superAdmin, "/admin/franchises")).toBe(true);
    expect(canAccess(superAdmin, "/manager")).toBe(true);
    expect(canAccess(superAdmin, "/kitchen")).toBe(true);
    expect(canAccess(superAdmin, "/cashier")).toBe(true);
    expect(canAccess(superAdmin, "/staff")).toBe(true);
  });
});
