import { prisma } from "../src/lib/prisma.js";

async function main() {
  console.log("=== USERS AUDIT ===");
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tenantId: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Found ${users.length} users:`);
  for (const u of users) {
    console.log(`- ${u.email} | Name: ${u.name} | Role: ${u.role} | Tenant: ${u.tenantId} | Active: ${u.isActive} | Created: ${u.createdAt.toISOString()}`);
  }

  console.log("\n=== TENANTS AUDIT ===");
  const tenants = await prisma.tenant.findMany();
  for (const t of tenants) {
    console.log(`- ID: ${t.id} | Code: ${t.code} | Name: ${t.name}`);
  }

  console.log("\n=== GLOBAL ENTITIES WITH NO TENANT OR UNMATCHED TENANT ===");
  const qrCodesWithoutTenant = await prisma.qrCode.count({
    where: { tenantId: { notIn: tenants.map(t => t.id) } },
  });
  console.log(`QR Codes outside existing tenants: ${qrCodesWithoutTenant}`);

  const printersWithoutTenant = await prisma.printer.count({
    where: { tenantId: { notIn: tenants.map(t => t.id) } },
  });
  console.log(`Printers outside existing tenants: ${printersWithoutTenant}`);

  const usersWithoutTenant = await prisma.user.count({
    where: { tenantId: { notIn: tenants.map(t => t.id) } },
  });
  console.log(`Users outside existing tenants: ${usersWithoutTenant}`);

  if (usersWithoutTenant > 0) {
    const orphanedUsers = await prisma.user.findMany({
      where: { tenantId: { notIn: tenants.map(t => t.id) } },
      select: { email: true, role: true, tenantId: true },
    });
    console.log("Orphaned users:", orphanedUsers);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
