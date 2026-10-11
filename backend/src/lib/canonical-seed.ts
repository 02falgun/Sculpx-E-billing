import { Prisma, Role, Dietary, SpiceLevel, QrType, TableStatus, RoomStatus, InventoryUnit } from "@prisma/client";
import { prisma } from "./prisma.js";
import { hashPassword, normalizeEmail } from "./password.js";
import { env } from "../config/env.js";

export const DEFAULT_PILOT_TENANT_ID = "e1b1d1f0-0000-4000-8000-000000000001";

/**
 * Staff Accounts per Part 4 (@ebilling.com convention + backward-compatible @demo.com)
 */
export const PILOT_STAFF_ACCOUNTS = [
  // Primary @ebilling.com convention
  {
    email: "superadmin@ebilling.com",
    name: "Kavya Kumar (Owner)",
    role: Role.SUPER_ADMIN,
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
    email: "admin@ebilling.com",
    name: "Rajesh Sharma",
    role: Role.ADMIN,
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
    email: "manager@ebilling.com",
    name: "Vikram Mehta",
    role: Role.MANAGER,
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
    email: "captain@ebilling.com",
    name: "Karan Verma",
    role: Role.CAPTAIN,
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
  {
    email: "waiter@ebilling.com",
    name: "Rahul Sharma",
    role: Role.WAITER,
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
  {
    email: "cashier@ebilling.com",
    name: "Pooja Verma",
    role: Role.CASHIER,
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
    email: "kitchenstaff@ebilling.com",
    name: "Chef Sanjeev",
    role: Role.KITCHEN_STAFF,
    phoneNumber: "+91 98765 43213",
    permissions: [
      "view_kds",
      "accept_kot",
      "start_cooking",
      "mark_ready",
      "expedite_kot",
    ],
  },
  // Legacy / test support accounts
  {
    email: "admin@demo.com",
    name: "Demo Administrator",
    role: Role.ADMIN,
    phoneNumber: "+91 98765 43200",
    permissions: ["all_admin"],
  },
  {
    email: "waiter@demo.com",
    name: "Demo Waiter",
    role: Role.WAITER,
    phoneNumber: "+91 98765 43201",
    permissions: ["view_tables", "create_orders", "pos_access"],
  },
  {
    email: "cashier@demo.com",
    name: "Demo Cashier",
    role: Role.CASHIER,
    phoneNumber: "+91 98765 43202",
    permissions: ["view_bills", "collect_payments"],
  },
  {
    email: "kitchen@demo.com",
    name: "Demo Chef",
    role: Role.KITCHEN_STAFF,
    phoneNumber: "+91 98765 43203",
    permissions: ["view_kds", "accept_kot", "mark_ready"],
  },
];

/**
 * 5 Canonical Categories exactly preserved per Part 3
 */
export const CANONICAL_CATEGORIES = [
  {
    name: "Starters & Appetizers",
    slug: "starters-appetizers",
    description: "Crispy bites, kebabs, and chef's soup selection",
    displayOrder: 1,
  },
  {
    name: "Signature Mains",
    slug: "signature-mains",
    description: "Authentic curries, biryanis, and continental platters",
    displayOrder: 2,
  },
  {
    name: "Artisan Pizzas & Pasta",
    slug: "artisan-pizzas-pasta",
    description: "Wood-fired stone oven pizzas and handmade pastas",
    displayOrder: 3,
  },
  {
    name: "Beverages & Cocktails",
    slug: "beverages-cocktails",
    description: "Specialty coffees, fresh juices, coolers, and mocktails",
    displayOrder: 4,
  },
  {
    name: "Gourmet Desserts",
    slug: "gourmet-desserts",
    description: "Rich pastries, traditional sweets, and artisanal gelato",
    displayOrder: 5,
  },
];

/**
 * 10 Canonical Menu Items exactly preserved per Part 3
 */
export const CANONICAL_MENU_ITEMS = [
  {
    name: "Royal Tandoori Paneer Tikka",
    categorySlug: "starters-appetizers",
    description: "Cottage cheese cubes marinated in Kashmiri chili, hung curd, and stone-ground spices roasted in clay tandoor.",
    price: 340.0,
    dietary: Dietary.VEG,
    spiceLevel: SpiceLevel.MEDIUM,
    preparationTimeMinutes: 15,
    taxRatePercentage: 5.0,
    isAvailable: true,
    modifierGroups: [
      {
        name: "Spice Level",
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        options: [
          { name: "Mild Spiced", price: 0.0, isDefault: true },
          { name: "Classic Spicy", price: 0.0 },
          { name: "Extra Fiery", price: 0.0 },
        ],
      },
      {
        name: "Extra Dips",
        isRequired: false,
        minSelections: 0,
        maxSelections: 2,
        options: [
          { name: "Mint & Coriander Chutney", price: 30.0 },
          { name: "Smoked Garlic Mayo", price: 40.0 },
        ],
      },
    ],
  },
  {
    name: "Smoked BBQ Chicken Wings",
    categorySlug: "starters-appetizers",
    description: "Crispy roasted bone-in wings glazed in hickory honey BBQ sauce with blue cheese dip.",
    price: 420.0,
    dietary: Dietary.NON_VEG,
    spiceLevel: SpiceLevel.MEDIUM,
    preparationTimeMinutes: 20,
    taxRatePercentage: 5.0,
    isAvailable: true,
    modifierGroups: [],
  },
  {
    name: "Parmesan Truffle Fries",
    categorySlug: "starters-appetizers",
    description: "Hand-cut Idaho potato fries tossed in Italian black truffle oil and freshly shaved parmesan cheese.",
    price: 280.0,
    dietary: Dietary.VEG,
    spiceLevel: SpiceLevel.NONE,
    preparationTimeMinutes: 10,
    taxRatePercentage: 5.0,
    isAvailable: true,
    modifierGroups: [],
  },
  {
    name: "Old Delhi Butter Chicken",
    categorySlug: "signature-mains",
    description: "Slow-simmered pulled tandoori chicken in velvety tomato, butter, and cashew gravy with fenugreek leaves.",
    price: 520.0,
    dietary: Dietary.NON_VEG,
    spiceLevel: SpiceLevel.MILD,
    preparationTimeMinutes: 20,
    taxRatePercentage: 5.0,
    isAvailable: true,
    modifierGroups: [
      {
        name: "Portion Size",
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        options: [
          { name: "Regular (2 Pieces)", price: 0.0, isDefault: true },
          { name: "Large (4 Pieces)", price: 260.0 },
        ],
      },
      {
        name: "Bread Pairing",
        isRequired: false,
        minSelections: 0,
        maxSelections: 2,
        options: [
          { name: "Butter Garlic Naan", price: 75.0 },
          { name: "Laccha Paratha", price: 65.0 },
        ],
      },
    ],
  },
  {
    name: "Bukhara 24-Hour Dal Makhani",
    categorySlug: "signature-mains",
    description: "Black lentils slow-cooked overnight on charcoal embers with fresh cream, butter, and sun-dried tomatoes.",
    price: 390.0,
    dietary: Dietary.VEG,
    spiceLevel: SpiceLevel.MILD,
    preparationTimeMinutes: 15,
    taxRatePercentage: 5.0,
    isAvailable: true,
    modifierGroups: [],
  },
  {
    name: "Hyderabadi Dum Gosht Biryani",
    categorySlug: "signature-mains",
    description: "Long-grain basmati rice and tender lamb cooked in sealed clay handi with saffron and caramelized onions.",
    price: 580.0,
    dietary: Dietary.NON_VEG,
    spiceLevel: SpiceLevel.MEDIUM,
    preparationTimeMinutes: 25,
    taxRatePercentage: 5.0,
    isAvailable: true,
    modifierGroups: [],
  },
  {
    name: "Wild Mushroom & Burrata Pizza",
    categorySlug: "artisan-pizzas-pasta",
    description: "San Marzano tomato base, roasted portobello mushrooms, fresh creamy burrata, and basil pesto drizzle.",
    price: 560.0,
    dietary: Dietary.VEG,
    spiceLevel: SpiceLevel.NONE,
    preparationTimeMinutes: 18,
    taxRatePercentage: 5.0,
    isAvailable: true,
    modifierGroups: [
      {
        name: "Crust Selection",
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        options: [
          { name: "Neapolitan Sourdough (Thin)", price: 0.0, isDefault: true },
          { name: "Cheese Burst Stuffed Edge", price: 90.0 },
        ],
      },
    ],
  },
  {
    name: "Creamy Alfredo Fettuccine",
    categorySlug: "artisan-pizzas-pasta",
    description: "Handmade ribbons of fettuccine pasta in rich aged parmesan cream with garlic and crushed black pepper.",
    price: 440.0,
    dietary: Dietary.VEG,
    spiceLevel: SpiceLevel.NONE,
    preparationTimeMinutes: 15,
    taxRatePercentage: 5.0,
    isAvailable: true,
    modifierGroups: [],
  },
  {
    name: "Artisan Nitro Cold Brew Coffee",
    categorySlug: "beverages-cocktails",
    description: "Single-origin Arabica steeped for 18 hours, infused with nitrogen for a velvety stout-like foam head.",
    price: 220.0,
    dietary: Dietary.VEGAN,
    spiceLevel: SpiceLevel.NONE,
    preparationTimeMinutes: 5,
    taxRatePercentage: 5.0,
    isAvailable: true,
    modifierGroups: [],
  },
  {
    name: "Classic Venetian Tiramisu",
    categorySlug: "gourmet-desserts",
    description: "Espresso-soaked Savoiardi biscuits layered with imported mascarpone zabaglione and Valrhona cocoa powder.",
    price: 320.0,
    dietary: Dietary.CONTAINS_EGG,
    spiceLevel: SpiceLevel.NONE,
    preparationTimeMinutes: 5,
    taxRatePercentage: 5.0,
    isAvailable: true,
    modifierGroups: [],
  },
];

/**
 * 10 Dining Tables and 3 Hotel Rooms
 */
export const CANONICAL_TABLES = [
  { number: "1", displayName: "Table 1", section: "Indoor Garden", capacity: 2, qrToken: "table-token-1" },
  { number: "2", displayName: "Table 2", section: "Indoor Garden", capacity: 2, qrToken: "table-token-2" },
  { number: "3", displayName: "Table 3", section: "Main Dining", capacity: 4, qrToken: "table-token-3" },
  { number: "4", displayName: "Table 4", section: "Main Dining", capacity: 4, qrToken: "table-token-4" },
  { number: "5", displayName: "Table 5", section: "Main Dining", capacity: 4, qrToken: "table-token-5" },
  { number: "6", displayName: "Table 6", section: "Terrace Bar", capacity: 6, qrToken: "table-token-6" },
  { number: "7", displayName: "Table 7", section: "Terrace Bar", capacity: 6, qrToken: "table-token-7" },
  { number: "8", displayName: "Table 8", section: "Poolside Cabana", capacity: 4, qrToken: "table-token-8" },
  { number: "9", displayName: "Table 9", section: "Poolside Cabana", capacity: 4, qrToken: "table-token-9" },
  { number: "10", displayName: "Table 10", section: "Private Dining", capacity: 10, qrToken: "table-token-10" },
];

export const CANONICAL_ROOMS = [
  { roomNumber: "101", floor: "1st Floor", guestName: "Rajeev Bansal", qrToken: "room-token-101" },
  { roomNumber: "301", floor: "3rd Floor", guestName: "Vikram Malhotra", qrToken: "room-token-301" },
  { roomNumber: "302", floor: "3rd Floor", guestName: "Ananya Roy", qrToken: "room-token-302" },
];

/**
 * Seed Canonical Pilot Dataset idempotently
 */
export async function seedCanonicalData(tenantId: string = DEFAULT_PILOT_TENANT_ID): Promise<{
  usersCount: number;
  categoriesCount: number;
  itemsCount: number;
  tablesCount: number;
  roomsCount: number;
  qrsCount: number;
}> {
  // Production Safety Guard: prevent automatic or accidental seeding in production
  if (env.NODE_ENV === "production" && !process.env.ALLOW_PILOT_SEED) {
    throw new Error(
      "CANONICAL_SEED_BLOCKED: Seeding accounts or demo fixtures is strictly prohibited in production without explicit ALLOW_PILOT_SEED=true."
    );
  }

  // 1. Staff Accounts with Role-Specific Credentials
  let usersCount = 0;
  for (const acc of PILOT_STAFF_ACCOUNTS) {
    const normalized = normalizeEmail(acc.email);
    const existing = await prisma.user.findUnique({ where: { email: normalized } });
    if (!existing) {
      // Resolve role-specific initial credential from environment
      const envKeyByRole: Record<string, string | undefined> = {
        SUPER_ADMIN: process.env.PILOT_PASSWORD_SUPER_ADMIN,
        ADMIN: process.env.PILOT_PASSWORD_ADMIN,
        MANAGER: process.env.PILOT_PASSWORD_MANAGER,
        CAPTAIN: process.env.PILOT_PASSWORD_CAPTAIN,
        WAITER: process.env.PILOT_PASSWORD_WAITER,
        CASHIER: process.env.PILOT_PASSWORD_CASHIER,
        KITCHEN_STAFF: process.env.PILOT_PASSWORD_KITCHEN_STAFF,
      };

      const rawPassword =
        envKeyByRole[acc.role] ||
        process.env.PILOT_INITIAL_PASSWORD ||
        env.DEMO_SEED_PASSWORD ||
        "demo-secure-pass";

      const passwordHash = await hashPassword(rawPassword);

      const u = await prisma.user.create({
        data: {
          tenantId,
          email: normalized,
          name: acc.name,
          role: acc.role,
          phoneNumber: acc.phoneNumber,
          isActive: true,
          passwordHash,
        },
      });
      if (acc.permissions.length > 0) {
        await prisma.userPermission.createMany({
          data: acc.permissions.map((p) => ({ userId: u.id, permissionKey: p })),
          skipDuplicates: true,
        });
      }
      usersCount++;
    }
  }

  // 2. Menu Categories
  const categoryMap = new Map<string, string>(); // slug -> categoryId
  let categoriesCount = 0;
  for (const cat of CANONICAL_CATEGORIES) {
    let category = await prisma.menuCategory.findFirst({
      where: { tenantId, name: cat.name },
    });
    if (!category) {
      category = await prisma.menuCategory.create({
        data: {
          tenantId,
          name: cat.name,
          description: cat.description,
          displayOrder: cat.displayOrder,
          isActive: true,
        },
      });
      categoriesCount++;
    }
    categoryMap.set(cat.slug, category.id);
  }

  // 3. Menu Items with Modifiers
  let itemsCount = 0;
  for (const itemDef of CANONICAL_MENU_ITEMS) {
    const categoryId = categoryMap.get(itemDef.categorySlug);
    if (!categoryId) continue;

    let item = await prisma.menuItem.findFirst({
      where: { categoryId, name: itemDef.name },
      include: { modifierGroups: { include: { options: true } } },
    });

    if (!item) {
      item = await prisma.menuItem.create({
        data: {
          categoryId,
          name: itemDef.name,
          description: itemDef.description,
          price: new Prisma.Decimal(itemDef.price),
          dietary: itemDef.dietary,
          spiceLevel: itemDef.spiceLevel,
          preparationTimeMinutes: itemDef.preparationTimeMinutes,
          taxRatePercentage: new Prisma.Decimal(itemDef.taxRatePercentage),
          isAvailable: itemDef.isAvailable,
        },
        include: { modifierGroups: { include: { options: true } } },
      });
      itemsCount++;
    }

    // Ensure Modifier Groups and Options exist idempotently
    for (const mg of itemDef.modifierGroups) {
      let group = await prisma.modifierGroup.findFirst({
        where: { menuItemId: item.id, name: mg.name },
      });
      if (!group) {
        group = await prisma.modifierGroup.create({
          data: {
            menuItemId: item.id,
            name: mg.name,
            isRequired: mg.isRequired,
            minSelections: mg.minSelections,
            maxSelections: mg.maxSelections,
          },
        });
      }

      for (const opt of mg.options) {
        const existingOpt = await prisma.modifierOption.findFirst({
          where: { groupId: group.id, name: opt.name },
        });
        if (!existingOpt) {
          await prisma.modifierOption.create({
            data: {
              groupId: group.id,
              name: opt.name,
              price: new Prisma.Decimal(opt.price),
            },
          });
        }
      }
    }
  }

  // 4. Tables and QR Codes
  let tablesCount = 0;
  let qrsCount = 0;
  for (const tDef of CANONICAL_TABLES) {
    let table = await prisma.table.findFirst({
      where: { tenantId, tableNumber: tDef.number },
    });
    if (!table) {
      table = await prisma.table.create({
        data: {
          tenantId,
          tableNumber: tDef.number,
          displayName: tDef.displayName,
          section: tDef.section,
          capacity: tDef.capacity,
          status: TableStatus.VACANT,
        },
      });
      tablesCount++;
    }

    // QR Code for Table
    const existingQr = await prisma.qrCode.findUnique({
      where: { token: tDef.qrToken },
    });
    if (!existingQr) {
      await prisma.qrCode.create({
        data: {
          tenantId,
          token: tDef.qrToken,
          type: QrType.TABLE,
          tableId: table.id,
          isActive: true,
        },
      });
      qrsCount++;
    }
  }

  // 5. Rooms and QR Codes
  let roomsCount = 0;
  for (const rDef of CANONICAL_ROOMS) {
    let room = await prisma.room.findFirst({
      where: { tenantId, roomNumber: rDef.roomNumber },
    });
    if (!room) {
      room = await prisma.room.create({
        data: {
          tenantId,
          roomNumber: rDef.roomNumber,
          floor: rDef.floor,
          guestName: rDef.guestName,
          status: RoomStatus.OCCUPIED,
        },
      });
      roomsCount++;
    }

    const existingQr = await prisma.qrCode.findUnique({
      where: { token: rDef.qrToken },
    });
    if (!existingQr) {
      await prisma.qrCode.create({
        data: {
          tenantId,
          token: rDef.qrToken,
          type: QrType.ROOM,
          roomId: room.id,
          isActive: true,
        },
      });
      qrsCount++;
    }
  }

  // 6. Inventory Base Items
  const inventoryDefs = [
    { name: "Malai Paneer", sku: "INV-PANEER-01", category: "Dairy", unit: InventoryUnit.KG, stock: 50.0, min: 10.0, cost: 320.0 },
    { name: "Fresh Chicken Breast", sku: "INV-CHICKEN-01", category: "Poultry", unit: InventoryUnit.KG, stock: 80.0, min: 15.0, cost: 240.0 },
    { name: "Basmati Rice (Aged)", sku: "INV-RICE-01", category: "Grains", unit: InventoryUnit.KG, stock: 100.0, min: 20.0, cost: 110.0 },
    { name: "Urad Dal Black Lentils", sku: "INV-DAL-01", category: "Pulses", unit: InventoryUnit.KG, stock: 60.0, min: 10.0, cost: 140.0 },
    { name: "San Marzano Tomatoes", sku: "INV-TOMATO-01", category: "Produce", unit: InventoryUnit.KG, stock: 45.0, min: 8.0, cost: 95.0 },
    { name: "Fresh Mozzarella / Burrata", sku: "INV-BURRATA-01", category: "Dairy", unit: InventoryUnit.KG, stock: 25.0, min: 5.0, cost: 550.0 },
    { name: "Arabica Coffee Beans", sku: "INV-COFFEE-01", category: "Beverage", unit: InventoryUnit.KG, stock: 20.0, min: 4.0, cost: 850.0 },
    { name: "Mascarpone Cheese", sku: "INV-MASCARPONE-01", category: "Dairy", unit: InventoryUnit.KG, stock: 15.0, min: 3.0, cost: 720.0 },
    { name: "Dairy Cream & Butter", sku: "INV-BUTTER-01", category: "Dairy", unit: InventoryUnit.KG, stock: 40.0, min: 8.0, cost: 420.0 },
    { name: "Whole Wheat Atta & Maida", sku: "INV-FLOUR-01", category: "Grains", unit: InventoryUnit.KG, stock: 90.0, min: 15.0, cost: 55.0 },
  ];

  for (const inv of inventoryDefs) {
    const existing = await prisma.inventoryItem.findFirst({
      where: { tenantId, sku: inv.sku },
    });
    if (!existing) {
      await prisma.inventoryItem.create({
        data: {
          tenantId,
          sku: inv.sku,
          name: inv.name,
          category: inv.category,
          unit: inv.unit,
          currentStock: new Prisma.Decimal(inv.stock),
          minimumThreshold: new Prisma.Decimal(inv.min),
          idealStock: new Prisma.Decimal(inv.stock * 1.5),
          unitCost: new Prisma.Decimal(inv.cost),
          isActive: true,
        },
      });
    }
  }

  return {
    usersCount,
    categoriesCount,
    itemsCount,
    tablesCount,
    roomsCount,
    qrsCount,
  };
}
