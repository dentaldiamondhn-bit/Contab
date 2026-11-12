const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Get ALL tenants with relevant sub-plan column
  var result = await admin.from('Tenant').select('id, businessname, businessemail, subscriptionplan, subscription_plan, subscriptionplans, tenant_code').order('createdat', { ascending: true });

  console.log('Total tenants in DB:', result.data ? result.data.length : 0);
  result.data.forEach(function(t) {
    var raw = t.subscriptionplan || t.subscription_plan || t.subscriptionplans;
    if (!raw) return; // skip empty ones
    var plans = [];
    try { plans = JSON.parse(raw); } catch(e) { plans = [{ code: raw, quantity: 1 }]; }
    var codes = plans.map(function(p) { return typeof p === 'string' ? p : p.code; }).join(', ');
    console.log(t.id + ' (' + t.businessname + '): ' + plans.length + ' plan(s) — ' + codes);
  });
}

main().catch(function(e) { console.error(e.message); }).then(function() { process.exit(0); });
