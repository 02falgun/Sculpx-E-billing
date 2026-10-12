import { IRoleService } from "../interfaces";
import { ApiResponse, Role } from "@/types";

const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

export class MockRoleService implements IRoleService {
  private customRoles = [
    {
      id: "role-1",
      name: "Senior Captain",
      description: "Floor lead with discount permission",
      baseRole: "CAPTAIN" as Role,
      permissions: ["orders.view", "orders.create", "orders.update", "tables.view", "tables.update", "billing.view"],
    },
  ];

  async getPermissionCatalog(): Promise<
    ApiResponse<{
      catalog: Array<{ key: string; name: string; category: string; description: string; isSensitive?: boolean }>;
      roleDefaults: Record<string, string[]>;
      roles: string[];
    }>
  > {
    await delay(100);
    return {
      success: true,
      data: {
        catalog: [
          { key: "dashboard.view", name: "View Dashboard", category: "General", description: "Access main overview" },
          { key: "rooms.view", name: "View Rooms", category: "Hotel Rooms", description: "View rooms list" },
          { key: "rooms.create", name: "Create Rooms", category: "Hotel Rooms", description: "Add new rooms" },
          { key: "rooms.update", name: "Edit Rooms", category: "Hotel Rooms", description: "Update room status & details" },
          { key: "rooms.deactivate", name: "Deactivate Rooms", category: "Hotel Rooms", description: "Archive rooms", isSensitive: true },
          { key: "tables.view", name: "View Tables", category: "Restaurant", description: "View table map" },
          { key: "tables.create", name: "Create Tables", category: "Restaurant", description: "Add restaurant tables" },
          { key: "tables.update", name: "Edit Tables", category: "Restaurant", description: "Update table status & info" },
          { key: "tables.deactivate", name: "Deactivate Tables", category: "Restaurant", description: "Archive tables", isSensitive: true },
          { key: "qr.manage", name: "Manage QR Codes", category: "Restaurant", description: "Regenerate/Rotate QR access", isSensitive: true },
          { key: "menu.view", name: "View Menu", category: "Menu", description: "Browse catalog" },
          { key: "menu.create", name: "Create Menu Items", category: "Menu", description: "Add categories & dishes" },
          { key: "menu.update", name: "Update Menu", category: "Menu", description: "Change prices & availability" },
          { key: "staff.view", name: "View Staff", category: "People", description: "View employee roster" },
          { key: "staff.invite", name: "Create Staff", category: "People", description: "Add staff members", isSensitive: true },
          { key: "staff.update", name: "Update Staff", category: "People", description: "Edit roles & permissions", isSensitive: true },
          { key: "staff.deactivate", name: "Deactivate Staff", category: "People", description: "Suspend staff accounts", isSensitive: true },
          { key: "billing.view", name: "View Bills", category: "Finance", description: "View invoices" },
          { key: "billing.create_invoice", name: "Generate Invoices", category: "Finance", description: "Produce bills" },
          { key: "payments.record", name: "Record Payments", category: "Finance", description: "Accept cash/UPI/card" },
          { key: "payments.refund", name: "Issue Refunds", category: "Finance", description: "Reverse transactions", isSensitive: true },
          { key: "reports.view", name: "View Reports", category: "Reports", description: "View analytics" },
          { key: "settings.manage", name: "Manage Settings", category: "System", description: "Edit hotel profile", isSensitive: true },
          { key: "audit.view", name: "View Audit Logs", category: "System", description: "Inspect system audit trail", isSensitive: true },
        ],
        roleDefaults: {
          SUPER_ADMIN: ["*"],
          ADMIN: ["*"],
          MANAGER: ["dashboard.view", "rooms.view", "tables.view", "menu.view", "menu.update", "staff.view", "billing.view", "reports.view"],
          CASHIER: ["dashboard.view", "billing.view", "billing.create_invoice", "payments.record"],
          CAPTAIN: ["dashboard.view", "tables.view", "orders.view", "orders.create", "orders.update"],
          WAITER: ["tables.view", "orders.view", "orders.create"],
          KITCHEN_STAFF: ["kitchen.view", "kitchen.update"],
        },
        roles: ["SUPER_ADMIN", "ADMIN", "MANAGER", "CASHIER", "CAPTAIN", "WAITER", "KITCHEN_STAFF"],
      },
    };
  }

  async getCustomRoles(): Promise<
    ApiResponse<
      Array<{
        id: string;
        name: string;
        description?: string;
        baseRole: Role;
        permissions: string[];
      }>
    >
  > {
    await delay(100);
    return { success: true, data: this.customRoles };
  }

  async createCustomRole(data: {
    name: string;
    description?: string;
    baseRole: Role;
    permissions: string[];
  }): Promise<ApiResponse<unknown>> {
    await delay(150);
    const newRole = {
      id: `role-${Date.now()}`,
      ...data,
      description: data.description || "",
    };
    this.customRoles.push(newRole);
    return { success: true, data: newRole, message: "Custom role created" };
  }

  async deleteCustomRole(id: string): Promise<ApiResponse<null>> {
    await delay(150);
    this.customRoles = this.customRoles.filter((r) => r.id !== id);
    return { success: true, data: null, message: "Custom role deleted" };
  }
}
