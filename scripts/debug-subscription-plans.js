const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // 1. Read raw tenant data
  var result = await admin.from('Tenant').select('*').eq('id', 'dent-bas-002').single();
  var tenant = result.data;
  if (!tenant) { console.error('Tenant not found'); process.exit(1); }

  console.log('\n=== RAW TENANT DATA FROM DB ===');
  console.log('subscriptionplans (raw DB):', tenant.subscriptionplans);
  console.log('type:', typeof tenant.subscriptionplans);

  // 2. Parse at same rate GET handler does
  var parsed;
  try {
    parsed = JSON.parse(tenant.subscriptionplans || '["PREMIUM"]');
    console.log('\n=== PARSED subscriptionplans ===');
    console.log('isArray:', Array.isArray(parsed));
    console.log('length:', parsed.length);
    parsed.forEach(function(p, i) {
      console.log('  [' + i + ']', typeof p === 'string' ? p : JSON.stringify(p));
    });
  } catch(e) {
    console.error('JSON.parse FAILED:', e.message);
  }

  // 3. enrichedPlans as GET handler builds it
  var planPrices = { PREMIUM: 1000, ENTERPRISE: 2000, STARTER: 200, GROWTH: 750 };
  var enriched = parsed.map(function(plan) {
    var planCode = typeof plan === 'string' ? plan : plan.code;
    var quantity  = typeof plan === 'string' ? 1 : (plan.quantity || 1);
    return { code: planCode, quantity: quantity, price: planPrices[planCode] || 500 };
  });
  console.log('\n=== enrichedPlans (returned to frontend) ===');
  console.log('items:', enriched.length, '| isArray:', Array.isArray(enriched));
  console.log('data:', JSON.stringify(enriched));

  // 4. Check all tenants for multi-plan entries
  var allResult = await admin.from('Tenant').select('id, businessname, subscriptionplans');
  var allTenants = allResult.data || [];
  console.log('\n=== ALL TENANTS subscriptionplans ===');
  allTenants.forEach(function(t) {
    try {
      var p = JSON.parse(t.subscriptionplans || '["PREMIUM"]');
      var codes = p.map(function(x) { return typeof x === 'string' ? x : x.code; }).join(', ');
      console.log('  ' + t.id + ' (' + t.businessname + '): ' + p.length + ' plan(s) — ' + codes);
    } catch(e) {
      console.log('  ' + t.id + ' (' + t.businessname + '): parse error: ' + e.message);
    }
  });

  // 5. Active plans in Plan table
  var plansResult = await admin.from('Plan').select('code, name, price, is_active');
  console.log('\n=== ACTIVE PLANS IN Plan TABLE ===');
  (plansResult.data || []).filter(function(p) { return p.is_active; }).forEach(function(p) {
    console.log('  ' + p.code + ': $' + p.price + ' (' + p.name + ')');
  });
}

main().catch(function(e) { console.error(e.message); }).then(function() { process.exit(0); });
