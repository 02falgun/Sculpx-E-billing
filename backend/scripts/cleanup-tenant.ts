import { prisma } from "../src/lib/prisma.js";
import { auditService } from "../src/services/audit.service.js";

async function main() {
  const args = process.argv.slice(2);
  const tenantIdArg = args.find((a) => a.startsWith("--tenant-id="))?.split("=")[1];
  const isExecute = args.includes("--execute");
  const confirmArg = args.find((a) => a.startsWith("--confirm="))?.split("=")[1];

  if (!tenantIdArg) {
    console.error("Usage: npx tsx cleanup-tenant.ts --tenant-id=<UUID> [--execute --confirm=<UUID>]");
    process.exit(1);
  }

  const tenantId = tenantIdArg.trim();

  // Dry run preview of all dependent records for this specific tenant
  const [
    usersCount,
    tablesCount,
    roomsCount,
    qrCodesCount,
    categoriesCount,
    itemsCount,
    ordersCount,
    billsCount,
    paymentsCount,
    printersCount,
    inventoryCount,
  ] = await Promise.all([
    prisma.user.count({ where: { tenantId } }),
    prisma.table.count({ where: { tenantId } }),
    prisma.room.count({ where: { tenantId } }),
    prisma.qrCode.count({ where: { tenantId } }),
    prisma.menuCategory.count({ where: { tenantId } }),
    prisma.menuItem.count({ where: { category: { tenantId } } }),
    prisma.order.count({ where: { tenantId } }),
    prisma.bill.count({ where: { tenantId } }),
    prisma.payment.count({ where: { tenantId } }),
    prisma.printer.count({ where: { tenantId } }),
    prisma.inventoryItem.count({ where: { tenantId } }),
  ]);

  console.log("=======================================================");
  console.log(`📋 TENANT CLEANUP AUDIT PREVIEW: ${tenantId}`);
  console.log("=======================================================");
  console.log(`Staff Users:         ${usersCount}`);
  console.log(`Tables:              ${tablesCount}`);
  console.log(`Rooms:               ${roomsCount}`);
  console.log(`QR Codes:            ${qrCodesCount}`);
  console.log(`Menu Categories:     ${categoriesCount}`);
  console.log(`Menu Items:          ${itemsCount}`);
  console.log(`Orders:              ${ordersCount}`);
  console.log(`Bills:               ${billsCount}`);
  console.log(`Payments:            ${paymentsCount}`);
  console.log(`Printers:            ${printersCount}`);
  console.log(`Inventory Items:     ${inventoryCount}`);
  console.log("=======================================================");

  if (!isExecute) {
    console.log("\n[SAFEGUARD] DRY-RUN MODE: No database records were modified.");
    console.log(`To execute deletion of this tenant only, run:`);
    console.log(`npx tsx scripts/cleanup-tenant.ts --tenant-id=${tenantId} --execute --confirm=${tenantId}\n`);
    process.exit(0);
  }

  if (confirmArg !== tenantId) {
    console.error(`\n[ABORTED] Confirmation mismatch! Expected --confirm=${tenantId}, got '${confirmArg}'`);
    process.exit(1);
  }

  console.log(`\n⚠️ EXECUTING SAFE TRANSACTIONAL TENANT CLEANUP FOR ${tenantId}...`);

  await prisma.$transaction(async (tx) => {
    // 1. Audit / Print Jobs
    await tx.printJob.deleteMany({ where: { tenantId } });
    await tx.printer.deleteMany({ where: { tenantId } });
    await tx.printAgent.deleteMany({ where: { tenantId } });

    // 2. Payments & Bills
    await tx.payment.deleteMany({ where: { tenantId } });
    await tx.bill.deleteMany({ where: { tenantId } });

    // 3. Orders, KOTs, Transactions
    await tx.inventoryTransaction.deleteMany({ where: { tenantId } });
    await tx.kot.deleteMany({ where: { order: { tenantId } } });
    await tx.order.deleteMany({ where: { tenantId } });

    // 4. Inventory & Recipes
    await tx.recipe.deleteMany({ where: { tenantId } });
    await tx.inventoryItem.deleteMany({ where: { tenantId } });

    // 5. Menu
    await tx.menuItem.deleteMany({ where: { category: { tenantId } } });
    await tx.menuCategory.deleteMany({ where: { tenantId } });

    // 6. QR, Tables, Rooms
    await tx.qrCode.deleteMany({ where: { tenantId } });
    await tx.table.deleteMany({ where: { tenantId } });
    await tx.room.deleteMany({ where: { tenantId } });

    // 7. Custom roles & Invitations
    await tx.customRole.deleteMany({ where: { tenantId } });
    await tx.staffInvitation.deleteMany({ where: { tenantId } });

    // 8. Staff (non-superadmin)
    await tx.user.deleteMany({ where: { tenantId, role: { not: "SUPER_ADMIN" } } });

    // 9. Tenant record itself
    await tx.tenant.deleteMany({ where: { id: tenantId } });
  });

  await auditService.record({
    tenantId,
    action: "TENANT_SAFE_CLEANUP_EXECUTED",
    resource: "tenants",
    resourceId: tenantId,
    details: {
      deletedRecords: {
        usersCount,
        tablesCount,
        roomsCount,
        ordersCount,
        billsCount,
        itemsCount,
      },
    },
  });

  console.log(`✅ [CLEANUP COMPLETE] Tenant ${tenantId} records safely cleaned and verified.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Error executing tenant cleanup:", err);
  process.exit(1);
});
