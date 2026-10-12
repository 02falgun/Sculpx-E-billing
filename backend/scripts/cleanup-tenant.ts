import { prisma } from "../src/lib/prisma.js";
import { auditService } from "../src/services/audit.service.js";

async function main() {
  const args = process.argv.slice(2);
  const tenantIdArg = args.find((a) => a.startsWith("--tenant-id="))?.split("=")[1];
  const isExecute = args.includes("--execute");
  const confirmArg = args.find((a) => a.startsWith("--confirm="))?.split("=")[1];
  const keepTenant = args.includes("--keep-tenant") || args.includes("--reset-to-empty");

  if (!tenantIdArg) {
    console.error("Usage: npx tsx scripts/cleanup-tenant.ts --tenant-id=<UUID> [--reset-to-empty] [--execute --confirm=<UUID>]");
    console.error("  --reset-to-empty : Cleans all business demo records (rooms, tables, menu, orders, bills, demo staff) while preserving the tenant profile and legitimate hotel administrator.");
    console.error("  --execute        : Performs the transactional deletion.");
    console.error("  --confirm=<UUID> : Confirms the exact tenant UUID to prevent accidental deletion.");
    process.exit(1);
  }

  const tenantId = tenantIdArg.trim();

  // Verify target tenant exists
  const targetTenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true, code: true, gstin: true, isActive: true },
  });

  if (!targetTenant) {
    console.error(`\n❌ Target tenant with ID '${tenantId}' was NOT found in the database. Aborting.`);
    process.exit(1);
  }

  // Dry run preview of all dependent records for this specific tenant
  const [
    usersCount,
    demoUsersCount,
    tablesCount,
    roomsCount,
    qrCodesCount,
    categoriesCount,
    itemsCount,
    ordersCount,
    billsCount,
    paymentsCount,
    printersCount,
    printJobsCount,
    inventoryCount,
    inventoryTxCount,
  ] = await Promise.all([
    prisma.user.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId, email: { contains: "@demo.com" } } }),
    prisma.table.count({ where: { tenantId } }),
    prisma.room.count({ where: { tenantId } }),
    prisma.qrCode.count({ where: { tenantId } }),
    prisma.menuCategory.count({ where: { tenantId } }),
    prisma.menuItem.count({ where: { category: { tenantId } } }),
    prisma.order.count({ where: { tenantId } }),
    prisma.bill.count({ where: { tenantId } }),
    prisma.payment.count({ where: { tenantId } }),
    prisma.printer.count({ where: { tenantId } }),
    prisma.printJob.count({ where: { tenantId } }),
    prisma.inventoryItem.count({ where: { tenantId } }),
    prisma.inventoryTransaction.count({ where: { tenantId } }),
  ]);

  console.log("=======================================================");
  console.log(`📋 TENANT CLEANUP AUDIT PREVIEW`);
  console.log("=======================================================");
  console.log(`Target Tenant ID:    ${targetTenant.id}`);
  console.log(`Target Tenant Name:  ${targetTenant.name} (${targetTenant.code})`);
  console.log(`Target Tenant GSTIN: ${targetTenant.gstin || "N/A"}`);
  console.log(`Cleanup Strategy:    ${keepTenant ? "RESET TO EMPTY (Preserve Tenant Profile & Admin)" : "COMPLETE TENANT PURGE"}`);
  console.log("-------------------------------------------------------");
  console.log(`Staff Users Total:   ${usersCount} (Demo @demo.com: ${demoUsersCount})`);
  console.log(`Tables:              ${tablesCount}`);
  console.log(`Rooms:               ${roomsCount}`);
  console.log(`QR Codes:            ${qrCodesCount}`);
  console.log(`Menu Categories:     ${categoriesCount}`);
  console.log(`Menu Items:          ${itemsCount}`);
  console.log(`Orders:              ${ordersCount}`);
  console.log(`Bills (Invoices):    ${billsCount}`);
  console.log(`Payments:            ${paymentsCount}`);
  console.log(`Printers:            ${printersCount}`);
  console.log(`Print Jobs:          ${printJobsCount}`);
  console.log(`Inventory Items:     ${inventoryCount}`);
  console.log(`Inventory Tx:        ${inventoryTxCount}`);
  console.log("=======================================================");

  if (!isExecute) {
    console.log("\n[SAFEGUARD] DRY-RUN MODE: No database records were modified.");
    console.log("To execute safely, review the counts above and run:");
    if (keepTenant) {
      console.log(`npx tsx scripts/cleanup-tenant.ts --tenant-id=${tenantId} --reset-to-empty --execute --confirm=${tenantId}\n`);
    } else {
      console.log(`npx tsx scripts/cleanup-tenant.ts --tenant-id=${tenantId} --execute --confirm=${tenantId}\n`);
    }
    process.exit(0);
  }

  if (confirmArg !== tenantId) {
    console.error(`\n[ABORTED] Confirmation mismatch! Expected --confirm=${tenantId}, got '${confirmArg}'`);
    process.exit(1);
  }

  console.log(`\n⚠️ EXECUTING SAFE TRANSACTIONAL CLEANUP FOR ${tenantId}...`);

  await prisma.$transaction(async (tx) => {
    // 1. Hardware & Print Jobs
    await tx.printJob.deleteMany({ where: { tenantId } });
    await tx.printer.deleteMany({ where: { tenantId } });
    await tx.printAgent.deleteMany({ where: { tenantId } });

    // 2. Financial: Payments, Bill Items, Bills
    await tx.payment.deleteMany({ where: { tenantId } });
    await tx.billItem.deleteMany({ where: { bill: { tenantId } } });
    await tx.bill.deleteMany({ where: { tenantId } });

    // 3. Operational: Inventory Transactions, KOT Items, KOTs, Order Items, Orders
    await tx.inventoryTransaction.deleteMany({ where: { tenantId } });
    await tx.kotItem.deleteMany({ where: { kot: { order: { tenantId } } } });
    await tx.kot.deleteMany({ where: { order: { tenantId } } });
    await tx.orderItem.deleteMany({ where: { order: { tenantId } } });

    // Release any currentOrderId foreign keys on tables
    await tx.table.updateMany({
      where: { tenantId },
      data: { currentOrderId: null },
    });
    await tx.order.deleteMany({ where: { tenantId } });

    // 4. Inventory & Recipes
    await tx.recipe.deleteMany({ where: { tenantId } });
    await tx.inventoryItem.deleteMany({ where: { tenantId } });

    // 5. Menu Catalog
    await tx.modifierOption.deleteMany({
      where: { group: { tenantId } },
    });
    await tx.menuItemModifierGroup.deleteMany({
      where: { menuItem: { category: { tenantId } } },
    });
    await tx.modifierGroup.deleteMany({ where: { tenantId } });
    await tx.menuItem.deleteMany({ where: { category: { tenantId } } });
    await tx.menuCategory.deleteMany({ where: { tenantId } });

    // 6. QR, Tables, Rooms
    await tx.qrCode.deleteMany({ where: { tenantId } });
    await tx.table.deleteMany({ where: { tenantId } });
    await tx.room.deleteMany({ where: { tenantId } });

    // 7. Custom roles & Invitations
    await tx.customRole.deleteMany({ where: { tenantId } });
    await tx.staffInvitation.deleteMany({ where: { tenantId } });

    // 8. Staff Accounts Handling
    if (keepTenant) {
      // Remove all demo accounts (*@demo.com)
      await tx.user.deleteMany({
        where: {
          tenantId,
          email: { contains: "@demo.com" },
        },
      });
      // Neutralize property profile
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          name: "Sculpx Pilot Hotel",
          gstin: null,
          serviceChargeRate: 0,
        },
      });
    } else {
      // Purge all staff under this tenant except global SUPER_ADMIN
      await tx.user.deleteMany({
        where: { tenantId, role: { not: "SUPER_ADMIN" } },
      });
      // Delete tenant container
      await tx.tenant.deleteMany({ where: { id: tenantId } });
    }
  });

  await auditService.record({
    tenantId,
    action: keepTenant ? "TENANT_RESET_TO_EMPTY_EXECUTED" : "TENANT_SAFE_PURGE_EXECUTED",
    resource: "tenants",
    resourceId: tenantId,
    details: {
      strategy: keepTenant ? "RESET_TO_EMPTY" : "FULL_PURGE",
      deletedRecords: {
        tablesCount,
        roomsCount,
        ordersCount,
        billsCount,
        itemsCount,
        printersCount,
      },
    },
  });

  console.log(`\n✅ [CLEANUP COMPLETE] Tenant ${tenantId} records successfully processed.`);
  if (keepTenant) {
    console.log("🎉 Property reset to clean state (0 rooms, 0 tables, 0 menu categories, 0 orders, 0 bills).");
    console.log("Hotel administrator account preserved for clean onboarding.");
  } else {
    console.log("Tenant record completely removed.");
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Error executing tenant cleanup:", err);
  process.exit(1);
});
