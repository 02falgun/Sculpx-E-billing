import { describe, it, expect } from "vitest";
import {
  DEMO_USERS,
  getDefaultRouteForRole,
  hasRole,
  canAccess,
  mockAuthenticate,
  getRoleDisplayName,
} from "@/utils/auth";

describe("Role-Based Authentication & Permissions Suite", () => {
  it("should have all 6 demo accounts configured", () => {
    expect(DEMO_USERS.waiter).toBeDefined();
    expect(DEMO_USERS.cashier).toBeDefined();
    expect(DEMO_USERS.kitchen).toBeDefined();
    expect(DEMO_USERS.manager).toBeDefined();
    expect(DEMO_USERS.admin).toBeDefined();
    expect(DEMO_USERS.superadmin).toBeDefined();
  });

  it("should route roles to their dedicated workspaces", () => {
    expect(getDefaultRouteForRole("WAITER")).toBe("/staff");
    expect(getDefaultRouteForRole("CAPTAIN")).toBe("/staff");
    expect(getDefaultRouteForRole("CASHIER")).toBe("/cashier");
    expect(getDefaultRouteForRole("KITCHEN_STAFF")).toBe("/kitchen");
    expect(getDefaultRouteForRole("MANAGER")).toBe("/manager");
    expect(getDefaultRouteForRole("ADMIN")).toBe("/admin");
    expect(getDefaultRouteForRole("SUPER_ADMIN")).toBe("/admin");
  });

  it("should authenticate demo emails correctly", () => {
    const waiterSession = mockAuthenticate("waiter@demo.com");
    expect(waiterSession).not.toBeNull();
    expect(waiterSession?.user.role).toBe("WAITER");

    const cashierSession = mockAuthenticate("cashier@demo.com");
    expect(cashierSession?.user.role).toBe("CASHIER");

    const kitchenSession = mockAuthenticate("kitchen@demo.com");
    expect(kitchenSession?.user.role).toBe("KITCHEN_STAFF");

    const managerSession = mockAuthenticate("manager@demo.com");
    expect(managerSession?.user.role).toBe("MANAGER");

    const adminSession = mockAuthenticate("admin@demo.com");
    expect(adminSession?.user.role).toBe("ADMIN");

    const superAdminSession = mockAuthenticate("superadmin@demo.com");
    expect(superAdminSession?.user.role).toBe("SUPER_ADMIN");
  });

  it("should enforce canAccess route boundaries", () => {
    const waiter = DEMO_USERS.waiter.user;
    const cashier = DEMO_USERS.cashier.user;
    const kitchen = DEMO_USERS.kitchen.user;
    const admin = DEMO_USERS.admin.user;

    // Customer public routes are always allowed
    expect(canAccess(null, "/menu/table/T01")).toBe(true);
    expect(canAccess(null, "/menu/room/301")).toBe(true);
    expect(canAccess(null, "/login")).toBe(true);

    // Waiter cannot access admin
    expect(canAccess(waiter, "/admin")).toBe(false);
    expect(canAccess(waiter, "/staff")).toBe(true);

    // Cashier cannot access kitchen or admin
    expect(canAccess(cashier, "/cashier")).toBe(true);
    expect(canAccess(cashier, "/kitchen")).toBe(false);
    expect(canAccess(cashier, "/admin")).toBe(false);

    // Kitchen cannot access billing or admin
    expect(canAccess(kitchen, "/kitchen")).toBe(true);
    expect(canAccess(kitchen, "/cashier")).toBe(false);
    expect(canAccess(kitchen, "/admin")).toBe(false);

    // Admin has access
    expect(canAccess(admin, "/admin")).toBe(true);
  });
});
