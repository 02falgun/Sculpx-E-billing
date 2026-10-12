import crypto from "node:crypto";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword, normalizeEmail } from "../src/lib/password.js";
import { auditService } from "../src/services/audit.service.js";

async function main() {
  const emailInput = process.env.SUPER_ADMIN_EMAIL || "superadmin@ebilling.com";
  const normalizedEmail = normalizeEmail(emailInput);
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { role: "SUPER_ADMIN" },
  });

  const forceReset = process.argv.includes("--reset");

  if (existingSuperAdmin && !forceReset) {
    console.log(`[BOOTSTRAP] Platform Super Admin already exists: ${existingSuperAdmin.email}`);
    console.log("[BOOTSTRAP] Database already has an authoritative platform administrator. No changes made.");
    process.exit(0);
  }

  const generatedPassword = process.env.SUPER_ADMIN_PASSWORD || crypto.randomBytes(12).toString("base64url") + "!1A";
  const passwordHash = await hashPassword(generatedPassword);

  let user;
  if (existingSuperAdmin && forceReset) {
    user = await prisma.user.update({
      where: { id: existingSuperAdmin.id },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
        isActive: true,
      },
    });
    console.log(`[BOOTSTRAP] Super Admin password rotated for ${user.email}`);
  } else {
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: process.env.SUPER_ADMIN_NAME || "Platform Super Administrator",
        role: "SUPER_ADMIN",
        passwordHash,
        isActive: true,
      },
    });
    console.log(`[BOOTSTRAP] Super Admin created: ${user.email}`);
  }

  await auditService.record({
    actorEmail: user.email,
    actorRole: "SUPER_ADMIN",
    action: forceReset ? "SUPERADMIN_PASSWORD_ROTATED" : "SUPERADMIN_BOOTSTRAPPED",
    resource: "users",
    resourceId: user.id,
    details: { email: user.email },
  });

  if (!process.env.SUPER_ADMIN_PASSWORD) {
    console.log("\n========================================================");
    console.log("🔐 ONE-TIME SUPER ADMIN SETUP CREDENTIAL:");
    console.log(`Email:    ${user.email}`);
    console.log(`Password: ${generatedPassword}`);
    console.log("Save these credentials securely. They will not be displayed again.");
    console.log("========================================================\n");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("[BOOTSTRAP] Error bootstrapping Super Admin:", err);
  process.exit(1);
});
