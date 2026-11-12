-- 013: Create chat_message table if missing + TenantCompensation used/usedat

-- 1. Create chat_message table if it doesn't exist
CREATE TABLE IF NOT EXISTS "chat_message" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "sender_id" TEXT NOT NULL,
  "receiver_id" TEXT,
  "message" TEXT NOT NULL,
  "is_read" BOOLEAN DEFAULT FALSE,
  "created_at" TIMESTAMPTZ DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Add updated_at if table existed but column was missing
ALTER TABLE "chat_message" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();

-- Backfill existing rows
UPDATE "chat_message" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;

-- 2. Add used/usedat to TenantCompensation if missing
ALTER TABLE "TenantCompensation" ADD COLUMN IF NOT EXISTS "used" BOOLEAN DEFAULT FALSE;
ALTER TABLE "TenantCompensation" ADD COLUMN IF NOT EXISTS "usedat" TIMESTAMPTZ;

-- Backfill used=FALSE for existing compensations
UPDATE "TenantCompensation" SET "used" = FALSE WHERE "used" IS NULL;
