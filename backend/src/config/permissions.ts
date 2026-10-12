import type { Role } from "@prisma/client";

export interface PermissionDefinition {
  key: string;
  name: string;
  category: "Overview" | "Accommodation" | "Restaurant" | "Menu" | "Inventory" | "Billing" | "Staff & Roles" | "Reports & System";
  description: string;
  isSensitive?: boolean;
}

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  // Overview
  { key: "dashboard.view", name: "View Dashboard", category: "Overview", description: "Access administrative and operational dashboards" },

  // Accommodation
  { key: "rooms.view", name: "View Rooms", category: "Accommodation", description: "View guestrooms, suites, and room statuses" },
  { key: "rooms.create", name: "Create Rooms", category: "Accommodation", description: "Add new hotel rooms and configure floor layout" },
  { key: "rooms.update", name: "Update Rooms", category: "Accommodation", description: "Modify room numbers, operational status, and details" },
  { key: "rooms.deactivate", name: "Deactivate Rooms", category: "Accommodation", description: "Safely deactivate or archive guestrooms", isSensitive: true },

  // Restaurant Fleet
  { key: "tables.view", name: "View Tables", category: "Restaurant", description: "Inspect dining tables, floor map, and occupancy" },
  { key: "tables.create", name: "Create Tables", category: "Restaurant", description: "Configure new restaurant tables and dining sections" },
  { key: "tables.update", name: "Update Tables", category: "Restaurant", description: "Edit table capacities, section names, and status" },
  { key: "tables.deactivate", name: "Deactivate Tables", category: "Restaurant", description: "Deactivate or release restaurant tables", isSensitive: true },
  { key: "qr.manage", name: "Manage QR Ordering", category: "Restaurant", description: "Generate, view, and rotate secure table and room QR tokens" },

  // Menu Catalog
  { key: "menu.view", name: "View Menu", category: "Menu", description: "View menu categories, dishes, modifiers, and prices" },
  { key: "menu.create", name: "Create Menu Items", category: "Menu", description: "Create new categories, menu items, and modifier groups" },
  { key: "menu.update", name: "Update Menu Items", category: "Menu", description: "Modify descriptions, prices, tax rates, and 86 availability" },
  { key: "menu.publish", name: "Publish Menu", category: "Menu", description: "Publish or hide dishes from customer ordering" },
  { key: "menu.archive", name: "Archive Menu Items", category: "Menu", description: "Archive or delete menu categories and items", isSensitive: true },

  // Orders & Kitchen
  { key: "orders.view", name: "View Orders", category: "Restaurant", description: "Inspect live and historical customer orders" },
  { key: "orders.create", name: "Create Orders (POS)", category: "Restaurant", description: "Place staff table-side or room-service orders" },
  { key: "orders.update", name: "Update Orders", category: "Restaurant", description: "Add items or special instructions to open orders" },
  { key: "orders.cancel", name: "Cancel Orders", category: "Restaurant", description: "Cancel active orders with required supervisor reason", isSensitive: true },
  { key: "kitchen.view", name: "View Kitchen (KDS)", category: "Restaurant", description: "Access Kitchen Display System tickets and timers" },
  { key: "kitchen.update", name: "Progress KOTs", category: "Restaurant", description: "Accept, cook, expedite, and mark KOTs ready" },

  // Billing & Finance
  { key: "billing.view", name: "View Invoices", category: "Billing", description: "View generated tax invoices, settlements, and bills" },
  { key: "billing.create_invoice", name: "Generate Invoices", category: "Billing", description: "Generate formal GST tax invoices from orders" },
  { key: "billing.discount", name: "Apply Discounts", category: "Billing", description: "Apply courtesy discounts or promotional adjustments", isSensitive: true },
  { key: "billing.void", name: "Void Bills", category: "Billing", description: "Void unsettled invoices with required audit trail", isSensitive: true },
  { key: "payments.record", name: "Record Payments", category: "Billing", description: "Record settlements across Cash, UPI, Card, or Folio" },
  { key: "payments.refund", name: "Process Refunds", category: "Billing", description: "Authorize and process payment refunds", isSensitive: true },

  // Inventory
  { key: "inventory.view", name: "View Inventory", category: "Inventory", description: "Inspect ingredient stock, unit costs, and reorder levels" },
  { key: "inventory.manage", name: "Manage Inventory", category: "Inventory", description: "Record restocks, wastage, recipe links, and adjustments" },

  // People & Access
  { key: "staff.view", name: "View Staff", category: "Staff & Roles", description: "View employee profiles, contact details, and role assignments" },
  { key: "staff.create", name: "Invite Staff", category: "Staff & Roles", description: "Onboard new hotel employees with assigned roles and credentials" },
  { key: "staff.update", name: "Update Staff Details", category: "Staff & Roles", description: "Edit staff phone numbers, names, and operational roles" },
  { key: "staff.deactivate", name: "Deactivate Staff", category: "Staff & Roles", description: "Deactivate employee accounts and revoke station access", isSensitive: true },
  { key: "staff.reset_password", name: "Reset Staff Passwords", category: "Staff & Roles", description: "Generate secure password resets and invalidate active sessions", isSensitive: true },
  { key: "roles.view", name: "View Roles", category: "Staff & Roles", description: "Inspect built-in and tenant custom roles" },
  { key: "roles.manage", name: "Manage Custom Roles", category: "Staff & Roles", description: "Create, edit, and configure custom role permission bundles" },
  { key: "permissions.assign", name: "Assign Granular Permissions", category: "Staff & Roles", description: "Grant or revoke specific permission keys on staff accounts", isSensitive: true },

  // Reports & System
  { key: "reports.view", name: "View Reports", category: "Reports & System", description: "Access daily revenue, GST tax reports, and shift velocity" },
  { key: "settings.manage", name: "Manage Hotel Settings", category: "Reports & System", description: "Configure hotel identity, tax parameters, and service charges" },
  { key: "audit.view", name: "View Audit Trail", category: "Reports & System", description: "Inspect operator audit logs, voids, price changes, and overrides" },
  { key: "tenant.manage", name: "Platform Tenant Governance", category: "Reports & System", description: "Onboard and administer multi-property hotel tenants (Super Admin only)", isSensitive: true },
];

export const ROLE_DEFAULT_PERMISSIONS: Record<Role, string[]> = {
  SUPER_ADMIN: PERMISSION_CATALOG.map((p) => p.key),
  ADMIN: PERMISSION_CATALOG.filter((p) => p.key !== "tenant.manage").map((p) => p.key),
  MANAGER: [
    "dashboard.view",
    "rooms.view",
    "rooms.update",
    "tables.view",
    "tables.update",
    "qr.manage",
    "menu.view",
    "menu.update",
    "orders.view",
    "orders.create",
    "orders.update",
    "orders.cancel",
    "kitchen.view",
    "kitchen.update",
    "billing.view",
    "billing.discount",
    "inventory.view",
    "inventory.manage",
    "reports.view",
    "audit.view",
  ],
  CASHIER: [
    "dashboard.view",
    "orders.view",
    "billing.view",
    "billing.create_invoice",
    "payments.record",
  ],
  CAPTAIN: [
    "dashboard.view",
    "tables.view",
    "rooms.view",
    "orders.view",
    "orders.create",
    "orders.update",
    "billing.view",
  ],
  WAITER: [
    "tables.view",
    "rooms.view",
    "orders.view",
    "orders.create",
    "orders.update",
  ],
  KITCHEN_STAFF: [
    "kitchen.view",
    "kitchen.update",
  ],
};
