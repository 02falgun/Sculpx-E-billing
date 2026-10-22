import { prisma } from "../src/database/prisma.js";

async function main() {
  console.log("=======================================================");
  console.log("🔍 COMPREHENSIVE READ-ONLY DATABASE INVENTORY");
  console.log("=======================================================\n");

  // 1. Tenants inventory
  const tenants = await prisma.tenant.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      gstin: true,
      isActive: true,
      createdAt: true,
    },
  });

  console.log(`Found ${tenants.length} Tenant(s) in Database:\n`);
  for (const t of tenants) {
    const [
      users,
      tables,
      rooms,
      qrCodes,
      categories,
      items,
      orders,
      bills,
      payments,
      printers,
      inventoryItems,
      recipes,
      auditLogs,
      customRoles,
    ] = await Promise.all([
      prisma.user.count({ where: { tenantId: t.id } }),
      prisma.table.count({ where: { tenantId: t.id } }),
      prisma.room.count({ where: { tenantId: t.id } }),
      prisma.qrCode.count({ where: { tenantId: t.id } }),
      prisma.menuCategory.count({ where: { tenantId: t.id } }),
      prisma.menuItem.count({ where: { category: { tenantId: t.id } } }),
      prisma.order.count({ where: { tenantId: t.id } }),
      prisma.bill.count({ where: { tenantId: t.id } }),
      prisma.payment.count({ where: { tenantId: t.id } }),
      prisma.printer.count({ where: { tenantId: t.id } }),
      prisma.inventoryItem.count({ where: { tenantId: t.id } }),
      prisma.recipe.count({ where: { tenantId: t.id } }),
      prisma.auditLog.count({ where: { tenantId: t.id } }),
      prisma.customRole.count({ where: { tenantId: t.id } }),
    ]);

    console.log(`🏢 Tenant ID:    ${t.id}`);
    console.log(`   Name:         ${t.name}`);
    console.log(`   Code:         ${t.code}`);
    console.log(`   GSTIN:        ${t.gstin || "N/A"}`);
    console.log(`   Is Active:    ${t.isActive}`);
    console.log(`   Created At:   ${t.createdAt.toISOString()}`);
    console.log(`   Record Counts:`);
    console.log(`     - Users:           ${users}`);
    console.log(`     - Tables:          ${tables}`);
    console.log(`     - Rooms:           ${rooms}`);
    console.log(`     - QR Codes:        ${qrCodes}`);
    console.log(`     - Menu Categories: ${categories}`);
    console.log(`     - Menu Items:      ${items}`);
    console.log(`     - Orders:          ${orders}`);
    console.log(`     - Bills:           ${bills}`);
    console.log(`     - Payments:        ${payments}`);
    console.log(`     - Printers:        ${printers}`);
    console.log(`     - Inventory Items: ${inventoryItems}`);
    console.log(`     - Recipes:         ${recipes}`);
    console.log(`     - Audit Logs:      ${auditLogs}`);
    console.log(`     - Custom Roles:    ${customRoles}`);
    console.log("");
  }

  // 2. Global counts
  const [
    totalUsers,
    superAdmins,
    totalTables,
    totalRooms,
    totalQrCodes,
    totalCategories,
    totalMenuItems,
    totalModifierGroups,
    totalModifierOptions,
    totalOrders,
    totalOrderItems,
    totalKots,
    totalKotItems,
    totalBills,
    totalBillItems,
    totalPayments,
    totalPrinters,
    totalPrintJobs,
    totalInventoryItems,
    totalInventoryTransactions,
    totalRecipes,
    totalAuditLogs,
    totalCustomRoles,
    totalStaffInvitations,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.findMany({
      where: { role: "SUPER_ADMIN" },
      select: { id: true, email: true, name: true, tenantId: true },
    }),
    prisma.table.count(),
    prisma.room.count(),
    prisma.qrCode.count(),
    prisma.menuCategory.count(),
    prisma.menuItem.count(),
    prisma.modifierGroup.count(),
    prisma.modifierOption.count(),
    prisma.order.count(),
    prisma.orderItem.count(),
    prisma.kot.count(),
    prisma.kotItem.count(),
    prisma.bill.count(),
    prisma.billItem.count(),
    prisma.payment.count(),
    prisma.printer.count(),
    prisma.printJob.count(),
    prisma.inventoryItem.count(),
    prisma.inventoryTransaction.count(),
    prisma.recipe.count(),
    prisma.auditLog.count(),
    prisma.customRole.count(),
    prisma.staffInvitation.count(),
  ]);

  console.log("=======================================================");
  console.log("📊 GLOBAL DATABASE TABLE RECORD TOTALS");
  console.log("=======================================================");
  console.log(`Total Users:                     ${totalUsers}`);
  console.log(`Platform Super Admins:           ${superAdmins.length}`);
  superAdmins.forEach((sa) => {
    console.log(`  * ${sa.email} (Tenant: ${sa.tenantId || "Global"})`);
  });
  console.log(`Total Tables:                    ${totalTables}`);
  console.log(`Total Rooms:                     ${totalRooms}`);
  console.log(`Total QR Codes:                  ${totalQrCodes}`);
  console.log(`Total Menu Categories:           ${totalCategories}`);
  console.log(`Total Menu Items:                ${totalMenuItems}`);
  console.log(`Total Modifier Groups:           ${totalModifierGroups}`);
  console.log(`Total Modifier Options:          ${totalModifierOptions}`);
  console.log(`Total Orders:                    ${totalOrders}`);
  console.log(`Total Order Items:               ${totalOrderItems}`);
  console.log(`Total KOTs:                      ${totalKots}`);
  console.log(`Total KOT Items:                 ${totalKotItems}`);
  console.log(`Total Bills (Invoices):          ${totalBills}`);
  console.log(`Total Bill Items:                ${totalBillItems}`);
  console.log(`Total Payments:                  ${totalPayments}`);
  console.log(`Total Printers:                  ${totalPrinters}`);
  console.log(`Total Print Jobs:                ${totalPrintJobs}`);
  console.log(`Total Inventory Items:           ${totalInventoryItems}`);
  console.log(`Total Inventory Transactions:    ${totalInventoryTransactions}`);
  console.log(`Total Recipes:                   ${totalRecipes}`);
  console.log(`Total Audit Logs:                ${totalAuditLogs}`);
  console.log(`Total Custom Roles:              ${totalCustomRoles}`);
  console.log(`Total Staff Invitations:         ${totalStaffInvitations}`);
  console.log("=======================================================\n");
}

main()
  .catch((e) => {
    console.error("Inventory failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
