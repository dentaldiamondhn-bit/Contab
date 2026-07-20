const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  var result = await admin.from('Tenant').select('*').eq('id', 'dent-bas-002').single();
  var t = result.data;
  console.log('DB subscriptionplan:', t.subscriptionplan);

  // Simulate the fixed GET handler
  var rawPlanData = t.subscriptionplan || t.subscription_plan || t.subscriptionPlans;
  console.log('rawPlanData used by GET handler:', rawPlanData);

  var subscriptionPlans = [];
  if (rawPlanData) {
    try { subscriptionPlans = JSON.parse(rawPlanData); }
    catch(e) { subscriptionPlans = [{ code: rawPlanData, quantity: 1 }]; }
  }
  console.log('Parsed plans:', JSON.stringify(subscriptionPlans));

  var planPrices = { PREMIUM: 1000, ENTERPRISE: 2000, STARTER: 200, GROWTH: 750, USUARIO: 100 };
  var enrichedPlans = subscriptionPlans.map(function(plan) {
    var planCode = typeof plan === 'string' ? plan : plan.code;
    var quantity  = typeof plan === 'string' ? 1 : (plan.quantity || 1);
    return { code: planCode, quantity: quantity, price: planPrices[planCode] || 500, name: 'Plan ' + planCode, description: 'Suscripción al plan ' + planCode };
  });

  console.log('\nenrichedPlans (what GET returns to frontend):');
  enrichedPlans.forEach(function(p) {
    console.log(' -', p.code, 'x' + p.quantity, '$' + p.price, '/month');
  });
  console.log('\nArray in enrichedPlans:', enrichedPlans.length, 'plans');
  console.log('tenant.subscriptionPlan (codes):', enrichedPlans.map(function(p) { return p.code; }).join(', '));
}

main().catch(function(e) { console.error(e.message); }).then(function() { process.exit(0); });
