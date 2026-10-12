-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'FRANCHISE',
    "legal_name" VARCHAR(255),
    "contact_email" VARCHAR(255),
    "contact_phone" VARCHAR(50),
    "address" VARCHAR(255),
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "brand_settings" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "organization_id" UUID,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "location_type" VARCHAR(50) NOT NULL DEFAULT 'COMBINED',
    "address" VARCHAR(255),
    "city" VARCHAR(100),
    "state" VARCHAR(100),
    "postal_code" VARCHAR(20),
    "country" VARCHAR(100) NOT NULL DEFAULT 'India',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "currency_symbol" VARCHAR(10) NOT NULL DEFAULT '₹',
    "contact_email" VARCHAR(255),
    "contact_phone" VARCHAR(50),
    "gstin" VARCHAR(50),
    "enabled_modules" JSONB DEFAULT '{"accommodation": true, "restaurant": true, "inventory": true, "kds": true}',
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_users" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" VARCHAR(50) NOT NULL DEFAULT 'FRANCHISE_OWNER',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_location_assignments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "location_id" UUID NOT NULL,
    "role" "Role",
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_location_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE UNIQUE INDEX "locations_tenant_id_key" ON "locations"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_code_key" ON "locations"("code");

-- CreateIndex
CREATE INDEX "locations_organization_id_idx" ON "locations"("organization_id");

-- CreateIndex
CREATE INDEX "locations_status_idx" ON "locations"("status");

-- CreateIndex
CREATE INDEX "organization_users_user_id_idx" ON "organization_users"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_users_organization_id_user_id_key" ON "organization_users"("organization_id", "user_id");

-- CreateIndex
CREATE INDEX "user_location_assignments_user_id_idx" ON "user_location_assignments"("user_id");

-- CreateIndex
CREATE INDEX "user_location_assignments_location_id_idx" ON "user_location_assignments"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_location_assignments_user_id_location_id_key" ON "user_location_assignments"("user_id", "location_id");

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_users" ADD CONSTRAINT "organization_users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_users" ADD CONSTRAINT "organization_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_location_assignments" ADD CONSTRAINT "user_location_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_location_assignments" ADD CONSTRAINT "user_location_assignments_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Data Migration: Backfill locations for any existing tenants that do not have a location record
INSERT INTO "locations" (
    "id",
    "organization_id",
    "tenant_id",
    "name",
    "code",
    "location_type",
    "timezone",
    "currency",
    "currency_symbol",
    "gstin",
    "status",
    "created_at",
    "updated_at"
)
SELECT
    gen_random_uuid(),
    NULL,
    t."id",
    t."name",
    t."code",
    'COMBINED',
    t."timezone",
    t."currency",
    t."currency_symbol",
    t."gstin",
    CASE WHEN t."is_active" THEN 'ACTIVE' ELSE 'SUSPENDED' END,
    t."created_at",
    t."updated_at"
FROM "tenants" t
WHERE NOT EXISTS (
    SELECT 1 FROM "locations" l WHERE l."tenant_id" = t."id"
);

-- Data Migration: Link existing users to their corresponding location
INSERT INTO "user_location_assignments" ("id", "user_id", "location_id", "role", "is_primary", "created_at")
SELECT
    gen_random_uuid(),
    u."id",
    l."id",
    u."role",
    true,
    CURRENT_TIMESTAMP
FROM "users" u
JOIN "locations" l ON l."tenant_id" = u."tenant_id"
WHERE NOT EXISTS (
    SELECT 1 FROM "user_location_assignments" ula WHERE ula."user_id" = u."id" AND ula."location_id" = l."id"
);
