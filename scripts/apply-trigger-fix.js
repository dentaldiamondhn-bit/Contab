require('dotenv').config({ path: '.env' });
const { Client } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) { console.error('DATABASE_URL not set'); process.exit(1); }

const client = new Client({ connectionString: DATABASE_URL });

const sql = `
-- Fix trigger function on Tenant and users tables
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

DROP TRIGGER IF EXISTS update_tenant_updated_at ON "Tenant";
CREATE TRIGGER update_tenant_updated_at
  BEFORE UPDATE ON "Tenant"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON "User";
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON "User"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Also add updated_at / created_at columns to Tenant if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'updated_at') THEN
    ALTER TABLE "Tenant" ADD COLUMN "updated_at" TIMESTAMP DEFAULT NOW();
    UPDATE "Tenant" SET "updated_at" = "updatedat" WHERE "updated_at" IS NULL;
    RAISE NOTICE 'updated_at column added to Tenant';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'created_at') THEN
    ALTER TABLE "Tenant" ADD COLUMN "created_at" TIMESTAMP DEFAULT NOW();
    UPDATE "Tenant" SET "created_at" = "createdat" WHERE "created_at" IS NULL;
    RAISE NOTICE 'created_at column added to Tenant';
  END IF;
END $$;

-- Show trigger function source for verification
SELECT proname, pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE proname = 'update_updated_at_column';

-- Show trigger on Tenant
SELECT tgname, tgrelid::regclass AS on_table, tgenabled
FROM pg_trigger
WHERE tgname = 'update_tenant_updated_at';
`;

client.query(sql, (err, result) => {
  if (err) {
    console.error('ERROR:', err.message);
    client.end();
    process.exit(1);
  }
  console.log('Patch applied successfully');
  if (result.commands) console.log('Commands:', result.commands);
  if (result.rows) result.rows.forEach(r => console.log(JSON.stringify(r, null, 2)));
  client.end();
  process.exit(0);
});
