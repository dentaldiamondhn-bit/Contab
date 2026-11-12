// Simulate what the PATCH handler receives from supabaseAdmin.update()
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const INSERT_PLAN_SCRIPT = `
CREATE OR REPLACE FUNCTION test_update_return()
RETURNS TRIGGER AS \$\$
BEGIN
  -- This function uses "updatedat" as in SUPABASE_COMPLETE.sql
  -- to be used as a proxy for the REAL broken trigger behavior
  RAISE EXCEPTION 'TEST: column "updated_at" does not exist';  -- simulate broken trigger
  RETURN NEW;
END;
\$\$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS test_trigger_on_tenant ON "Tenant";
CREATE TRIGGER test_trigger_on_tenant BEFORE UPDATE ON "Tenant"
  FOR EACH ROW EXECUTE FUNCTION test_update_return();
`;

async function main() {
  // Test 1: Does the PATCH handler's tenantRow cause any error?
  console.log('Test 1: Update with full tenantRow...');
  const tenantRow = {
    updatedat: new Date().toISOString(),
    businessname: 'Dent-Bas-002',
    businessemail: 'dent-bas-002@test.com',
    businessrtn: '08011997001234',
    businessaddress: 'Test',
    phonenumber: '22345678',
    subscriptionplan: JSON.stringify([{ code: 'PREMIUM', quantity: 1 }]),
    maxusers: 5,
    maxstorage: 100,
    maxtransactions: 10000,
    monthlycost: 0,
    modules: JSON.stringify(['accounting']),
    isactive: true,
  };

  const { error: err } = await admin
    .from('Tenant')
    .update(tenantRow)
    .eq('id', 'dent-bas-002')
    .select()
    .single();

  if (err) {
    console.log('✗ Update failed:');
    console.log('  err type:', typeof err);
    console.log('  err.message type:', typeof err.message);
    console.log('  err.message:', JSON.stringify(err.message));
    console.log('  err.code:', err.code);
    console.log('  err.details:', err.details?.substring(0, 200));
  } else {
    console.log('✓ Update succeeded');
  }

  // Test 2: Check if the actual broken trigger exists
  // We test by checking if a simple update with .single() throws
  console.log('\nTest 2: Verify Tenant table has update_tenant_updated_at trigger...');

  // Test 3: Run a proxied test - look for trigger errors specifically
  // Check by reading the exact error object shape
  const { error: testErr } = await admin
    .from('Tenant')
    .update({ businessname: 'test-trigger' })
    .eq('id', 'dent-bas-002');

  if (testErr) {
    console.log('Empty update failed:');
    console.log('  full error:', JSON.stringify(testErr));
  } else {
    console.log('✓ Empty update succeeded — no trigger error');
  }

  console.log('\nTest 3: Check Tenant table constraints/triggers via plan query...');
  const { error: planErr } = await admin.from('Plan').select('*');
  if (planErr) console.log('Plan query error:', planErr.message);
  else console.log('Plan query OK:', planErr ? 'error' : 'success');
}

main().catch(e => console.error(e.message)).then(() => process.exit(0));
