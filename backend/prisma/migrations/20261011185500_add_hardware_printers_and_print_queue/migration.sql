-- AlterEnum
ALTER TYPE "PrintJobStatus" ADD VALUE IF NOT EXISTS 'UNCERTAIN';
ALTER TYPE "PrintJobStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- AlterTable printers: Add station, location, paper_width_mm, is_active, is_default, connection_type, updated_at
ALTER TABLE "printers"
  ADD COLUMN IF NOT EXISTS "station" VARCHAR(50),
  ADD COLUMN IF NOT EXISTS "location" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "paper_width_mm" INTEGER NOT NULL DEFAULT 80,
  ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "is_default" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "connection_type" VARCHAR(50) NOT NULL DEFAULT 'NETWORK_TCP',
  ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable print_jobs: Add reference_id, max_retries, next_retry_at, idempotency_key, is_reprint, reprint_reason, initiated_by, completed_at
ALTER TABLE "print_jobs"
  ADD COLUMN IF NOT EXISTS "reference_id" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "max_retries" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS "next_retry_at" TIMESTAMPTZ(6),
  ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "is_reprint" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "reprint_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "initiated_by" VARCHAR(100) DEFAULT 'SYSTEM',
  ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "printers_tenant_id_idx" ON "printers"("tenant_id");
CREATE INDEX IF NOT EXISTS "printers_tenant_id_type_idx" ON "printers"("tenant_id", "type");
CREATE INDEX IF NOT EXISTS "printers_tenant_id_is_active_idx" ON "printers"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "print_jobs_tenant_id_status_idx" ON "print_jobs"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "print_jobs_tenant_id_printer_id_idx" ON "print_jobs"("tenant_id", "printer_id");
CREATE INDEX IF NOT EXISTS "print_jobs_tenant_id_reference_id_idx" ON "print_jobs"("tenant_id", "reference_id");
CREATE INDEX IF NOT EXISTS "print_jobs_tenant_id_idempotency_key_idx" ON "print_jobs"("tenant_id", "idempotency_key");
