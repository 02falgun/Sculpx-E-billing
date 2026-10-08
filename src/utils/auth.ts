import { Role, User, AuthSession } from "@/types";

export interface DemoUserConfig {
  user: User;
  role: Role;
  roleName: string;
  defaultRoute: string;
  description: string;
  badgeColor: string;
}

export const DEMO_USERS: Record<string, DemoUserConfig> = {
  waiter: {
    user: {
      id: "usr-demo-waiter",
      name: "Rahul Sharma",
      email: "waiter@demo.com",
      role: "WAITER",
      isActive: true,
      phoneNumber: "+91 98765 43211",
      permissions: [
        "view_tables",
        "create_orders",
        "update_orders",
        "pos_access",
        "request_bill",
        "view_staff_orders",
      ],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    role: "WAITER",
    roleName: "Waiter / Floor Staff",
    defaultRoute: "/staff",
    description: "Table-side orders, live floor statuses, and fast mobile POS",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  cashier: {
    user: {
      id: "usr-demo-cashier",
      name: "Pooja Verma",
      email: "cashier@demo.com",
      role: "CASHIER",
      isActive: true,
      phoneNumber: "+91 98765 43212",
      permissions: [
        "view_bills",
        "collect_payments",
        "print_receipts",
        "apply_discounts",
        "view_outstanding",
        "split_bills",
        "process_refunds",
      ],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    role: "CASHIER",
    roleName: "Cashier / Billing Desk",
    defaultRoute: "/cashier",
    description: "Settlements, digital tax bills, UPI/Card payments, and receipts",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  kitchen: {
    user: {
      id: "usr-demo-kitchen",
      name: "Chef Sanjeev",
      email: "kitchen@demo.com",
      role: "KITCHEN_STAFF",
      isActive: true,
      phoneNumber: "+91 98765 43213",
      permissions: [
        "view_kds",
        "accept_kot",
        "start_cooking",
        "mark_ready",
        "expedite_kot",
      ],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    role: "KITCHEN_STAFF",
    roleName: "Kitchen Staff / Expediter",
    defaultRoute: "/kitchen",
    description: "High-contrast KDS board, elapsed timers, and ticket progression",
    badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
  },
  manager: {
    user: {
      id: "usr-demo-manager",
      name: "Vikram Mehta",
      email: "manager@demo.com",
      role: "MANAGER",
      isActive: true,
      phoneNumber: "+91 98765 43214",
      permissions: [
        "view_operations",
        "view_all_orders",
        "view_kitchen",
        "view_billing",
        "manage_exceptions",
        "override_orders",
        "view_reports",
        "pos_access",
      ],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    role: "MANAGER",
    roleName: "Floor Manager",
    defaultRoute: "/manager",
    description: "Real-time floor velocity, operational exceptions, and shift audits",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
  admin: {
    user: {
      id: "usr-demo-admin",
      name: "Rajesh Sharma",
      email: "admin@demo.com",
      role: "ADMIN",
      isActive: true,
      phoneNumber: "+91 98765 43210",
      permissions: [
        "all_admin",
        "manage_menu",
        "manage_tables",
        "manage_rooms",
        "manage_inventory",
        "manage_printers",
        "manage_qr",
        "manage_users",
        "view_reports",
        "manage_settings",
      ],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    role: "ADMIN",
    roleName: "Hotel / Restaurant Admin",
    defaultRoute: "/admin",
    description: "Catalog manager, QR generator, hardware printers, and inventory",
    badgeColor: "bg-slate-900 text-white border-slate-900",
  },
  superadmin: {
    user: {
      id: "usr-demo-superadmin",
      name: "Kavya Kumar (Owner)",
      email: "superadmin@demo.com",
      role: "SUPER_ADMIN",
      isActive: true,
      phoneNumber: "+91 98765 43299",
      permissions: [
        "all_admin",
        "all_superadmin",
        "manage_integrations",
        "system_configuration",
        "audit_logs",
        "database_controls",
        "hotel_hierarchy",
      ],
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
    role: "SUPER_ADMIN",
    roleName: "Super Admin (Owner)",
    defaultRoute: "/admin",
    description: "Multi-property governance, system integrations, and audit trail",
    badgeColor: "bg-rose-900 text-amber-300 border-rose-900",
  },
};

/**
 * Returns default landing workspace route for a role
 */
export function getDefaultRouteForRole(role?: Role | null): string {
  switch (role) {
    case "WAITER":
    case "CAPTAIN":
      return "/staff";
    case "CASHIER":
      return "/cashier";
    case "KITCHEN_STAFF":
      return "/kitchen";
    case "MANAGER":
      return "/manager";
    case "ADMIN":
    case "SUPER_ADMIN":
      return "/admin";
    default:
      return "/login";
  }
}

/**
 * Human readable label for roles
 */
export function getRoleDisplayName(role?: Role | null): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "Super Admin";
    case "ADMIN":
      return "Administrator";
    case "MANAGER":
      return "Restaurant Manager";
    case "CAPTAIN":
      return "Floor Captain";
    case "WAITER":
      return "Waiter / Staff";
    case "CASHIER":
      return "Cashier";
    case "KITCHEN_STAFF":
      return "Kitchen Staff";
    default:
      return "Guest / Customer";
  }
}

/**
 * Check if a user has any of the required roles
 */
export function hasRole(user: User | null | undefined, allowedRoles: Role[]): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true; // Super Admin has superuser access
  return allowedRoles.includes(user.role);
}

/**
 * Check if a user possesses a specific permission string
 */
export function hasPermission(user: User | null | undefined, permission: string): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN") return true;
  if (user.permissions?.includes("all_admin") || user.permissions?.includes("all_superadmin")) {
    return true;
  }
  return !!user.permissions?.includes(permission);
}

/**
 * Centralized route-level access guard
 */
export function canAccess(user: User | null | undefined, pathname: string): boolean {
  // Public customer routes
  if (
    pathname.startsWith("/menu") ||
    pathname.startsWith("/cart") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/order") ||
    pathname.startsWith("/bill") ||
    pathname === "/" ||
    pathname === "/login"
  ) {
    return true;
  }

  if (!user) return false;

  // Super Admin can access everything
  if (user.role === "SUPER_ADMIN") return true;

  // Staff / Waiter workspace
  if (pathname.startsWith("/staff") || pathname.startsWith("/dashboard") || pathname.startsWith("/pos") || pathname.startsWith("/tables")) {
    return ["WAITER", "CAPTAIN", "MANAGER", "ADMIN"].includes(user.role);
  }

  // Cashier workspace
  if (pathname.startsWith("/cashier") || pathname.startsWith("/billing")) {
    return ["CASHIER", "MANAGER", "ADMIN"].includes(user.role);
  }

  // Kitchen workspace
  if (pathname.startsWith("/kitchen")) {
    return ["KITCHEN_STAFF", "MANAGER", "ADMIN"].includes(user.role);
  }

  // Manager workspace
  if (pathname.startsWith("/manager")) {
    return ["MANAGER", "ADMIN"].includes(user.role);
  }

  // Admin workspace
  if (pathname.startsWith("/admin")) {
    return ["ADMIN", "SUPER_ADMIN"].includes(user.role);
  }

  return false;
}

/**
 * Mock authentication resolver for demo / dev login
 */
export function mockAuthenticate(email: string, _password?: string): AuthSession | null {
  const normalized = email.trim().toLowerCase();

  // Find user matching email or alias
  const entry = Object.values(DEMO_USERS).find(
    (cfg) => cfg.user.email.toLowerCase() === normalized
  );

  if (!entry) {
    // If not matching default, fallback by matching keyword
    if (normalized.includes("waiter")) return createMockSession(DEMO_USERS.waiter.user);
    if (normalized.includes("cashier")) return createMockSession(DEMO_USERS.cashier.user);
    if (normalized.includes("kitchen") || normalized.includes("chef")) return createMockSession(DEMO_USERS.kitchen.user);
    if (normalized.includes("manager")) return createMockSession(DEMO_USERS.manager.user);
    if (normalized.includes("admin")) return createMockSession(DEMO_USERS.admin.user);
    if (normalized.includes("super")) return createMockSession(DEMO_USERS.superadmin.user);
    return null;
  }

  return createMockSession(entry.user);
}

function createMockSession(user: User): AuthSession {
  return {
    user,
    token: `demo-jwt-${user.role.toLowerCase()}-${Date.now()}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}
