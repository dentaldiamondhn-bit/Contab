const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Test 1: getPlanPrices simulation - read Plan table
  console.log('Test 1: Fetching Plan table via supabaseAdmin...');
  const { data: plans, error: planErr } = await supabase
    .from('Plan')
    .select('code, price')
    .eq('is_active', true);

  if (planErr) {
    console.log('Plan query FAILED:', planErr.message, planErr.code);
    process.exit(1);
  }
  console.log('Plan query OK; rows:', plans?.length);
  console.log('Sample:', JSON.stringify((plans || []).slice(0, 3)));

  // Test 2: actual PATCH-form tenantRow on dent-bas-002, end to end
  const tenantRow = {
    updatedat: new Date().toISOString(),
    businessname: 'Dental Bas Test',
    businessemail: 'dent-bas-002@test.com',
    businessrtn: 'TEST123',
    businessaddress: 'Test Address',
    phonenumber: '98765432',
    country: 'HN',
    timezone: 'America/Tegucigalpa',
    currency: 'HNL',
    subscriptionplan: JSON.stringify([{ code: 'PREMIUM', quantity: 1 }]),
    maxusers: 5,
    maxstorage: 100,
    maxtransactions: 10000,
    monthlycost: 0,
    modules: '',
    isactive: true,
  };

  console.log('\nTest 2: Full tenantRow update on dent-bas-002...');
  const { error: err2, data: d2 } = await supabase
    .from('Tenant')
    .update(tenantRow)
    .eq('id', 'dent-bas-002')
    .select('id, businessname, subscriptionplan, updatedat, monthlycost, modules')
    .single();

  if (err2) {
    console.log('Tenant update FAILED:');
    console.log('  message:', err2.message);
    console.log('  code:',    err2.code);
    console.log('  details:', JSON.stringify(err2.details));
    console.log('  full:',    JSON.stringify(err2));
    console.log('  typeof err.message:', typeof err2.message);
    console.log('  typeof err.details:', typeof err2.details);
    process.exit(1);
  }
  console.log('Tenant update OK');
  console.log('  id:',              d2.id);
  console.log('  businessname:',    d2.businessname);
  console.log('  subscriptionplan:', d2.subscriptionplan);
  console.log('  updatedat:',       d2.updatedat);
  console.log('  monthlycost:',     d2.monthlycost);

  console.log('\nTest 3: Return key format (checking null keys)...');
  // The object after update - verify what types came back  
  const sp = d2.subscriptionplan;
  try { console.log('  JSON.parse(sp):', JSON.parse(sp)); } catch(e) { console.log('  Cannot JSON.parse subplan'); }
}

main().catch(e => console.error(e.message)).then(() => process.exit(0));
