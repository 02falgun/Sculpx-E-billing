import { seedDemoUsers } from "../lib/seed.js";
import { disconnectPrisma } from "../lib/prisma.js";

async function main() {
  try {
    console.log("🌱 Starting idempotent demo staff account seed...");
    const result = await seedDemoUsers();
    console.log(
      `✅ Seed completed successfully: ${result.created} created, ${result.existing} already existed (total: ${result.total}).`
    );
    for (const u of result.users) {
      console.log(`   - ${u.email} [${u.role}]: ${u.status}`);
    }
  } catch (err) {
    console.error("❌ Seed failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    await disconnectPrisma();
  }
}

main();
