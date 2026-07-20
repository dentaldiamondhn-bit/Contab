const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  var result = await admin.from('Tenant').select('id, businessname, businessemail, subscriptionplan, subscription_plan, subscriptionplans').order('createdat', { ascending: true });
  var tenants = result.data || [];
  console.log('All tenants in DB:', tenants.length);
  tenants.forEach(function(t) {
    var sp = t.subscriptionplan, sp2 = t.subscription_plan, sp3 = t.subscriptionplans;
    var label = sp != null ? 'subscriptionplan' : (sp2 != null ? 'subscription_plan' : (sp3 != null ? 'subscriptionplans' : 'NONE'));
    var raw = sp != null ? sp : (sp2 != null ? sp2 : (sp3 != null ? sp3 : 'null'));
    console.log('---');
    console.log('id:', t.id, '| name:', t.businessname, '| email:', t.businessemail);
    console.log('column with data:', label);
    console.log('raw value:', raw);
    try {
      var parsed = JSON.parse(raw || '["PREMIUM"]');
      console.log('parsed:', JSON.stringify(parsed));
    } catch(e) {
      console.log('not JSON, raw string:', raw);
    }
  });

  // Fix: copy subscriptionplans IS NULL into subscriptionplan column for ALL tenants
  // (i.e. sync the actual plans stored in subscription_plan -> subscriptionplan as JSON array)
  console.log('\n=== SYNC MISSING subscriptionplan COLUMN ===');
  for (var i = 0; i < tenants.length; i++) {
    var t = tenants[i];
    if (t.subscriptionplan == null) {
      // Copy from subscription_plan (CSV string like "PREMIUM") into subscriptionplan (JSON array)
      var raw = t.subscription_plan || 'PREMIUM';
      var newVal = '["' + raw + '"]';
      var codes = raw.split(',');
      var arr = [];
      codes.forEach(function(c) {
        var code = c.trim();
        if (code) arr.push({ code: code, quantity: 1 });
      });
      newVal = JSON.stringify(arr);
      
      console.log('Fixing tenant', t.id, ': subscription_plan="' + raw + '" -> subscriptionplan=' + newVal);
      
      var upd = await admin.from('Tenant').update({ subscriptionplan: newVal }).eq('id', t.id);
      if (upd.error) console.error('  ERROR:', upd.error.message);
      else console.log('  OK');
    }
  }

  // Done
  console.log('\nDone.');
}

main().catch(function(e) { console.error(e.message); }).then(function() { process.exit(0); });
