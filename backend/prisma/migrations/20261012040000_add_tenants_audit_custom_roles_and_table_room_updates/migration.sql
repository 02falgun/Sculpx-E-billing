-- AlterTable
ALTER TABLE "rooms" ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "room_type" VARCHAR(50) DEFAULT 'STANDARD';

-- AlterTable
ALTER TABLE "tables" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "token_version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "currency_symbol" VARCHAR(10) NOT NULL DEFAULT '₹',
    "gstin" VARCHAR(50),
    "cgst_rate" DECIMAL(5,2) NOT NULL DEFAULT 2.50,
    "sgst_rate" DECIMAL(5,2) NOT NULL DEFAULT 2.50,
    "service_charge_rate" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "has_accommodation" BOOLEAN NOT NULL DEFAULT true,
    "has_restaurant" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID,
    "actor_id" UUID,
    "actor_email" VARCHAR(255),
    "actor_role" VARCHAR(50),
    "action" VARCHAR(100) NOT NULL,
    "resource" VARCHAR(100) NOT NULL,
    "resource_id" VARCHAR(100),
    "details" JSONB DEFAULT '{}',
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_roles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "base_role" "Role" NOT NULL DEFAULT 'WAITER',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_invitations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "token" VARCHAR(100) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_code_key" ON "tenants"("code");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_created_at_idx" ON "audit_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- CreateIndex
CREATE INDEX "custom_roles_tenant_id_idx" ON "custom_roles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_roles_tenant_id_name_key" ON "custom_roles"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "staff_invitations_token_key" ON "staff_invitations"("token");

-- CreateIndex
CREATE INDEX "staff_invitations_tenant_id_email_idx" ON "staff_invitations"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "rooms_tenant_id_is_active_idx" ON "rooms"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_tenant_id_room_number_key" ON "rooms"("tenant_id", "room_number");

-- CreateIndex
CREATE INDEX "tables_tenant_id_is_active_idx" ON "tables"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "tables_tenant_id_table_number_key" ON "tables"("tenant_id", "table_number");
