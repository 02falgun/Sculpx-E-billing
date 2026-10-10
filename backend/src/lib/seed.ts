import { Role } from "@prisma/client";
import { prisma } from "./prisma.js";
import { env } from "../config/env.js";
import { hashPassword, normalizeEmail } from "./password.js";

export const DEFAULT_DEMO_TENANT_ID = "e1b1d1f0-0000-4000-8000-000000000001";

export interface DemoUserSeedDefinition {
  email: string;
  name: string;
  role: Role;
  phoneNumber: string;
  permissions: string[];
}

/**
 * Six core staff accounts defined in requirements + Captain role resolution.
 */
export const DEMO_STAFF_ACCOUNTS: DemoUserSeedDefinition[] = [
  {
    email: "superadmin@demo.com",
    name: "Kavya Kumar (Owner)",
    role: "SUPER_ADMIN",
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
  },
  {
    email: "admin@demo.com",
    name: "Rajesh Sharma",
    role: "ADMIN",
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
  },
  {
    email: "manager@demo.com",
    name: "Vikram Mehta",
    role: "MANAGER",
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
  },
  {
    email: "kitchen@demo.com",
    name: "Chef Sanjeev",
    role: "KITCHEN_STAFF",
    phoneNumber: "+91 98765 43213",
    permissions: [
      "view_kds",
      "accept_kot",
      "start_cooking",
      "mark_ready",
      "expedite_kot",
    ],
  },
  {
    email: "cashier@demo.com",
    name: "Pooja Verma",
    role: "CASHIER",
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
  },
  {
    email: "waiter@demo.com",
    name: "Rahul Sharma",
    role: "WAITER",
    phoneNumber: "+91 98765 43211",
    permissions: [
      "view_tables",
      "create_orders",
      "update_orders",
      "pos_access",
      "request_bill",
      "view_staff_orders",
    ],
  },
  // Explicit resolution of Captain role:
  {
    email: "captain@demo.com",
    name: "Karan Verma",
    role: "CAPTAIN",
    phoneNumber: "+91 98765 43215",
    permissions: [
      "view_tables",
      "create_orders",
      "update_orders",
      "pos_access",
      "request_bill",
      "view_staff_orders",
      "override_orders",
    ],
  },
];

export interface SeedResult {
  total: number;
  created: number;
  existing: number;
  users: Array<{ email: string; role: Role; status: "created" | "already_exists" }>;
}

/**
 * Idempotent seed function for development and testing environments.
 * Guarded against unintended production execution.
 */
export async function seedDemoUsers(options: { force?: boolean } = {}): Promise<SeedResult> {
  if (env.NODE_ENV === "production" && !options.force && !env.ALLOW_DEMO_SEED) {
    throw new Error(
      "Seeding aborted: Demo accounts cannot be seeded into production environment."
    );
  }

  const results: SeedResult = {
    total: DEMO_STAFF_ACCOUNTS.length,
    created: 0,
    existing: 0,
    users: [],
  };

  const demoPassword = env.DEMO_SEED_PASSWORD;
  const passwordHash = await hashPassword(demoPassword);

  for (const account of DEMO_STAFF_ACCOUNTS) {
    const normalized = normalizeEmail(account.email);
    const existingUser = await prisma.user.findUnique({
      where: { email: normalized },
    });

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
      results.existing += 1;
      results.users.push({ email: normalized, role: account.role, status: "already_exists" });
      // Note: Never overwrite existing user passwords during a repeated seed
    } else {
      const newUser = await prisma.user.create({
        data: {
          tenantId: DEFAULT_DEMO_TENANT_ID,
          email: normalized,
          name: account.name,
          role: account.role,
          phoneNumber: account.phoneNumber,
          isActive: true,
          passwordHash,
        },
      });
      userId = newUser.id;
      results.created += 1;
      results.users.push({ email: normalized, role: account.role, status: "created" });

      // Seed permissions for newly created user in a single batch
      if (account.permissions.length > 0) {
        await prisma.userPermission.createMany({
          data: account.permissions.map((permissionKey) => ({
            userId,
            permissionKey,
          })),
          skipDuplicates: true,
        });
      }
    }
  }

  return results;
}
