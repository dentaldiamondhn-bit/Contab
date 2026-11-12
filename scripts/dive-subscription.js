const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Show ALL column names from DB
  var result = await admin.from('Tenant').select('*').eq('id', 'dent-bas-002').single();
  var t = result.data;
  if (!t) { console.error('Tenant not found'); process.exit(1); }

  console.log('=== ALL DB COLUMNS ===');
  Object.keys(t).sort().forEach(function(k) {
    console.log('  ' + k + ':', JSON.stringify(t[k]));
  });

  // Show the sub-related columns
  console.log('\n=== subscription-related fields ===');
  console.log('subscriptionplans:', t.subscriptionplans, typeof t.subscriptionplans);
  console.log('subscription_plan:', t.subscription_plan, typeof t.subscription_plan);
  console.log('subscriptionPlan:', t.subscriptionPlan, typeof t.subscriptionPlan);
  console.log('subscription_plans:', t.subscription_plans, typeof t.subscription_plans);

  // Also check all tenants sub-fields
  var all = await admin.from('Tenant').select('id, businessname, subscriptionplans, subscription_plan, subscription_plans').limit(10);
  console.log('\n=== ALL TENANTS sub-fields ===');
  (all.data || []).forEach(function(row) {
    var sp = row.subscriptionplans, sp2 = row.subscription_plan, sp3 = row.subscription_plans;
    console.log('  ' + row.id + ' | ' + row.businessname);
    console.log('    subscriptionplans:', sp != null ? JSON.stringify(sp) : 'null');
    console.log('    subscription_plan:', sp2 != null ? JSON.stringify(sp2) : 'null');
    console.log('    subscription_plans:', sp3 != null ? JSON.stringify(sp3) : 'null');
  });
}

main().catch(function(e) { console.error(e.message); }).then(function() { process.exit(0); });
