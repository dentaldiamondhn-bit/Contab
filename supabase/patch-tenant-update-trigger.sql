-- =====================================================
-- PATCH DB: Fix trigger function on Tenant and users tables
-- =====================================================
-- Root cause: update_updated_at_column() references
-- "updated_at" (with underscore) but Tenant table has
-- "updatedat" (no underscore) created by SUPABASE_COMPLETE.sql.
-- "User" table has "updatedAt" (camelCase).
-- =====================================================

-- Recreate trigger function with correct per-table column names
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
DECLARE
  tbl TEXT;
BEGIN
  tbl := TG_TABLE_NAME;
  IF tbl = 'Tenant' THEN
    NEW."updatedat" := CURRENT_TIMESTAMP;
  ELSIF tbl = 'User' THEN
    NEW."updatedAt" := CURRENT_TIMESTAMP;
  ELSE
    NEW."updated_at" := CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-create trigger on Tenant table
DROP TRIGGER IF EXISTS update_tenant_updated_at ON "Tenant";
CREATE TRIGGER update_tenant_updated_at
  BEFORE UPDATE ON "Tenant"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Re-create trigger on users (User) table
-- Note: SUPABASE_COMPLETE.sql uses uppercase "User" for the table name
-- SUPABASE_MIGRATE.sql uses lowercase "users" — handle both
DROP TRIGGER IF EXISTS update_users_updated_at ON "User";
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON "User"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON "users";
CREATE TRIGGER update_users_updated_at_lower
  BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Also add "updated_at" / "created_at" columns to
-- Tenant if only "updatedat"/"createdat" exist,
-- so existing triggers that reference them work too.
-- =====================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'updated_at') THEN
    ALTER TABLE "Tenant" ADD COLUMN "updated_at" TIMESTAMP DEFAULT NOW();
    -- Copy values from "updatedat" into "updated_at"
    UPDATE "Tenant" SET "updated_at" = "updatedat" WHERE "updated_at" IS NULL;
    RAISE NOTICE 'Column updated_at added to Tenant and populated from updatedat';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'created_at') THEN
    ALTER TABLE "Tenant" ADD COLUMN "created_at" TIMESTAMP DEFAULT NOW();
    UPDATE "Tenant" SET "created_at" = "createdat" WHERE "created_at" IS NULL;
    RAISE NOTICE 'Column created_at added to Tenant and populated from createdat';
  END IF;
END $$;

-- =====================================================
-- Verification
-- =====================================================
SELECT 
  'updated_trigger_fixed' AS patch_status,
  NOW() AS fixed_at;

-- Show trigger function
SELECT tgname, tgtype, tgrelid::regclass AS table_name
FROM pg_trigger
WHERE tgname IN ('update_tenant_updated_at', 'update_users_updated_at', 'update_users_updated_at_lower')
ORDER BY tgname;
