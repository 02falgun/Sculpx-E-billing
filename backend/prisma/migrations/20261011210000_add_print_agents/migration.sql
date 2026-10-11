-- AlterTable printers: Add agent_id
ALTER TABLE "printers"
  ADD COLUMN IF NOT EXISTS "agent_id" UUID;

-- CreateTable print_agents
CREATE TABLE IF NOT EXISTS "print_agents" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "device_id" VARCHAR(100) NOT NULL,
  "api_key_hash" VARCHAR(128) NOT NULL,
  "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  "is_online" BOOLEAN NOT NULL DEFAULT false,
  "last_connected_at" TIMESTAMPTZ(6),
  "last_heartbeat_at" TIMESTAMPTZ(6),
  "last_disconnected_at" TIMESTAMPTZ(6),
  "ip_address" VARCHAR(45),
  "version" VARCHAR(50),
  "metadata" JSONB,
  "permitted_printer_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "print_agents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "print_agents_device_id_key" ON "print_agents"("device_id");
CREATE INDEX IF NOT EXISTS "print_agents_tenant_id_idx" ON "print_agents"("tenant_id");
CREATE INDEX IF NOT EXISTS "print_agents_tenant_id_status_idx" ON "print_agents"("tenant_id", "status");
CREATE INDEX IF NOT EXISTS "printers_tenant_id_agent_id_idx" ON "printers"("tenant_id", "agent_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'printers_agent_id_fkey'
  ) THEN
    ALTER TABLE "printers" ADD CONSTRAINT "printers_agent_id_fkey"
      FOREIGN KEY ("agent_id") REFERENCES "print_agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
