import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/lib/password.js";

async function main() {
  console.log("=== TESTING DYNAMIC ONBOARDING & CREATION WORKFLOWS ===");

  const tenant = await prisma.tenant.findUnique({
    where: { id: "e1b1d1f0-0000-4000-8000-000000000001" },
  });
  if (!tenant) throw new Error("Tenant not found");
  console.log(`Tenant: ${tenant.name} (${tenant.id})`);

  // 1. Dynamic Table Creation
  console.log("\n1. Testing dynamic table creation...");
  const table = await prisma.table.create({
    data: {
      tenantId: tenant.id,
      tableNumber: "T-PILOT-01",
      displayName: "Pilot Table 1",
      capacity: 4,
      section: "Terrace Garden",
    },
  });
  console.log(`✓ Created Table: ${table.displayName} (ID: ${table.id})`);

  // 2. Dynamic Room Creation
  console.log("\n2. Testing dynamic guestroom creation...");
  const room = await prisma.room.create({
    data: {
      tenantId: tenant.id,
      roomNumber: "R-PILOT-101",
      floor: "First Floor",
      roomType: "Executive Suite",
      capacity: 2,
    },
  });
  console.log(`✓ Created Room: ${room.roomNumber} (ID: ${room.id})`);

  // 3. Dynamic Menu Category & Item Creation
  console.log("\n3. Testing dynamic menu catalog creation...");
  const category = await prisma.menuCategory.create({
    data: {
      tenantId: tenant.id,
      name: "Pilot Starters",
      description: "Handcrafted starters",
      displayOrder: 1,
    },
  });
  const item = await prisma.menuItem.create({
    data: {
      categoryId: category.id,
      name: "Truffle Fries",
      description: "Crispy fries with black truffle oil",
      price: 350.0,
      dietary: "VEG",
      preparationTimeMinutes: 12,
    },
  });
  console.log(`✓ Created Category: ${category.name} -> Item: ${item.name} (₹${item.price})`);

  // 4. Dynamic Staff Account Creation
  console.log("\n4. Testing hotel administrator staff onboarding...");
  const passwordHash = await hashPassword("StaffPass#2026");
  const newStaff = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: "Priya Sharma",
      email: "priya.waiter@hotel.com",
      role: "WAITER",
      phoneNumber: "+91 98765 00001",
      passwordHash,
      isActive: true,
    },
  });
  console.log(`✓ Created Staff: ${newStaff.name} (${newStaff.email}, Role: ${newStaff.role})`);

  // Verify persistence
  const countTables = await prisma.table.count({ where: { tenantId: tenant.id } });
  const countRooms = await prisma.room.count({ where: { tenantId: tenant.id } });
  const countItems = await prisma.menuItem.count({ where: { category: { tenantId: tenant.id } } });
  const countStaff = await prisma.user.count({ where: { tenantId: tenant.id } });

  console.log("\n=== VERIFIED PERSISTENCE COUNTS ===");
  console.log(`Tables: ${countTables} (Expected 1)`);
  console.log(`Rooms:  ${countRooms} (Expected 1)`);
  console.log(`Items:  ${countItems} (Expected 1)`);
  console.log(`Users:  ${countStaff} (Expected 3: SuperAdmin, Admin, Priya)`);

  if (countTables !== 1 || countRooms !== 1 || countItems !== 1 || countStaff !== 3) {
    throw new Error("Persistence count verification failed!");
  }

  // 5. Clean up the test verification records so the database is in pristine 0-record state for pilot launch
  console.log("\n5. Cleaning up verification records to return to pristine zero-state...");
  await prisma.user.delete({ where: { id: newStaff.id } });
  await prisma.menuItem.delete({ where: { id: item.id } });
  await prisma.menuCategory.delete({ where: { id: category.id } });
  await prisma.room.delete({ where: { id: room.id } });
  await prisma.table.delete({ where: { id: table.id } });

  const finalTables = await prisma.table.count({ where: { tenantId: tenant.id } });
  const finalUsers = await prisma.user.count({ where: { tenantId: tenant.id } });
  console.log(`Final state: ${finalTables} tables, ${finalUsers} users (Admin & Super Admin only).`);
  console.log("✓ Dynamic creation and persistence verified with 100% success!");
}

main()
  .catch((e) => {
    console.error("Test failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
