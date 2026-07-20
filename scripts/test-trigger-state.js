/** Execute SQL fix on Supabase via supabaseAdmin RPC */
// This verifies the trigger function is working on the DB side

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) { console.error('Missing env vars'); process.exit(1); }

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  // 1. Inspect current trigger function body
  const { data: funcRows, error: funcErr } = await supabase
    .rpc('pg_get_functiondef', { p_oid: 'update_updated_at_column()' });

  if (funcErr) console.log('Function inspect (may not exist):', funcErr.message);
  else console.log('Current function:', funcRows);

  // 2. Test simple update on tenant dent-bas-002 — check if even basic update fails
  const testUpdate = {
    businessname: 'Dental Bas Test',
    updatedat: new Date().toISOString()
  };
  const { error: testErr } = await supabase
    .from('Tenant')
    .update(testUpdate)
    .eq('id', 'dent-bas-002');

  if (testErr) {
    console.log('✗ Tenant update test failed:');
    console.log('  message:', testErr.message);
    console.log('  code:',    testErr.code);
    console.log('  details:', testErr.details);
    console.log('  help:',    testErr.hint);
  } else {
    console.log('✓ Tenant update works OK (trigger may be absent/broken/correct)');
  }

  // 3. Check whether the update_tenant_updated_at trigger exists
  const { data: triggers, error: trigErr } = await supabase
    .from('pg_trigger')
    .select('tgname, tgrelid, tgenabled')
    .eq('tgname', 'update_tenant_updated_at');
  if (trigErr) console.log('Trigger check error (expected):', trigErr.message);
  else if (triggers?.length) console.log('✓ Trigger exists (active):', JSON.stringify(triggers));
  else console.log('✗ Trigger does NOT exist on db — the fix might already be applied or never run.');
}

main().catch(e => console.error(e.message)).then(() => process.exit(0));
