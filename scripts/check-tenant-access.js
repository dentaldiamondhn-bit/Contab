const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Test 1: select('*') - what the GET handler uses
  console.log('Test 1: select * from Tenant where id = dent-bas-002');
  var r1 = await admin.from('Tenant').select('*').eq('id', 'dent-bas-002').single();
  console.log('  returned:', r1.data ? 'data' : r1.error ? 'error: ' + r1.error.message : 'null');

  // Test 2: select specific columns
  console.log('\nTest 2: select subscriptionplan where id = dent-bas-002');
  var r2 = await admin.from('Tenant').select('subscriptionplan').eq('id', 'dent-bas-002').single();
  console.log('  returned:', JSON.stringify(r2.data));

  // Test 3: full list with *
  console.log('\nTest 3: select * from Tenant (all rows)');
  var r3 = await admin.from('Tenant').select('*').limit(10);
  console.log('  total:', r3.data ? r3.data.length : 0);
  if (r3.data) {
    r3.data.forEach(function(t) { console.log('  ' + t.id + ' (' + t.businessname + ')'); });
  }

  // Test 4: full list with specific cols
  console.log('\nTest 4: select id, businessname, subscriptionplan from Tenant (all rows)');
  var r4 = await admin.from('Tenant').select('id, businessname, subscriptionplan, subscription_plan').limit(10);
  console.log('  total:', r4.data ? r4.data.length : 0);
  if (r4.data) {
    r4.data.forEach(function(t) { console.log('  ' + t.id + ' (' + t.businessname + '): sp=', t.subscriptionplan, ' / sp2=', t.subscription_plan); });
  }
}

main().catch(function(e) { console.error(e.message); }).then(function() { process.exit(0); });
