import { prisma } from "../src/lib/prisma.js";

async function main() {
  const tenantId = "e1b1d1f0-0000-4000-8000-000000000001";

  const categories = await prisma.menuCategory.findMany({
    where: { tenantId },
    include: {
      _count: { select: { items: true } },
    },
    orderBy: { displayOrder: "asc" },
  });

  const items = await prisma.menuItem.findMany({
    where: { category: { tenantId } },
    include: {
      category: true,
      modifierGroups: {
        include: {
          options: true,
        },
      },
    },
    orderBy: [{ categoryId: "asc" }, { name: "asc" }],
  });

  const modifierGroups = await prisma.modifierGroup.findMany({
    where: { menuItem: { category: { tenantId } } },
    include: { options: true },
  });

  const modifierOptionsCount = await prisma.modifierOption.count({
    where: { group: { menuItem: { category: { tenantId } } } },
  });

  console.log("=== MENU RECONCILIATION AUDIT ===");
  console.log(`Total Categories in DB: ${categories.length}`);
  console.log(`Total Menu Items in DB: ${items.length}`);
  console.log(`Total Modifier Groups: ${modifierGroups.length}`);
  console.log(`Total Modifier Options: ${modifierOptionsCount}`);

  // Classify categories
  const canonicalNames = [
    "Starters & Appetizers",
    "Signature Mains",
    "Artisan Pizzas & Pasta",
    "Beverages & Cocktails",
    "Gourmet Desserts",
  ];

  const canonicalCats = categories.filter((c) => canonicalNames.includes(c.name));
  const testCats = categories.filter((c) => !canonicalNames.includes(c.name));

  console.log("\n=======================================================");
  console.log(`1. CANONICAL PILOT CATEGORIES (${canonicalCats.length}):`);
  console.log("=======================================================");
  for (const cat of canonicalCats) {
    console.log(`\n📁 Category: "${cat.name}" (Active: ${cat.isActive}, Items: ${cat._count.items})`);
    const catItems = items.filter((i) => i.categoryId === cat.id);
    catItems.forEach((item, idx) => {
      console.log(
        `   ${idx + 1}. "${item.name}" — ₹${item.price} (Avail: ${item.isAvailable}, Modifiers: ${item.modifierGroups.length})`
      );
      item.modifierGroups.forEach((mg) => {
        console.log(
          `      └─ Group "${mg.name}" (Required: ${mg.isRequired}): ${mg.options.map((o) => `"${o.name}" (+₹${o.price})`).join(", ")}`
        );
      });
    });
  }


  console.log("\n=======================================================");
  console.log(`3. EPHEMERAL TEST-FIXTURE CATEGORIES (${testCats.length}):`);
  console.log("=======================================================");
  const testCatSummary = new Map<string, number>();
  testCats.forEach((c) => {
    const base = c.name.replace(/\d+$/, "").trim();
    testCatSummary.set(base, (testCatSummary.get(base) || 0) + c._count.items);
  });
  testCatSummary.forEach((count, name) => {
    console.log(` - Test Group "${name}": ${count} items total across test runs`);
  });

  // Check all users in tenant
  const users = await prisma.user.findMany({
    where: { tenantId },
    select: { id: true, email: true, name: true, role: true, isActive: true },
  });
  console.log(`\nTotal Users in Tenant: ${users.length}`);
  users.forEach((u) => {
    console.log(` - ${u.email} [${u.role}] (${u.name}, active: ${u.isActive})`);
  });

  // Check tables and rooms
  const tables = await prisma.table.count({ where: { tenantId } });
  const rooms = await prisma.room.count({ where: { tenantId } });
  const qrCodes = await prisma.qrCode.count({ where: { tenantId } });
  console.log(`\nTables count: ${tables}, Rooms count: ${rooms}, QR Codes count: ${qrCodes}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
