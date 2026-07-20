const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Test 1: Check exact PATCH handler logic
  console.log('Executing PATCH-equivalent update for dent-bas-002...');
  
  const fieldMap = {
    businessName: 'businessname', businessEmail: 'businessemail',
    businessRTN: 'businessrtn', businessAddress: 'businessaddress',
    phoneNumber: 'phonenumber', subscriptionPlans: 'subscriptionplan',
    maxUsers: 'maxusers', maxStorage: 'maxstorage',
    maxTransactions: 'maxtransactions', monthlyCost: 'monthlycost',
    modules: 'modules', isActive: 'isactive',
  };

  const body = {
    businessName: 'Dent-Bas-002',
    businessEmail: 'dent-bas-002@test.com',
    businessRTN: '08011997001234',
    businessAddress: 'Calle 456',
    phoneNumber: '99887766',
    subscriptionPlans: JSON.stringify([{ code: 'PREMIUM', quantity: 1 }, { code: 'GROWTH', quantity: 1 }]),
    maxUsers: 5, maxStorage: 100, maxTransactions: 10000, monthlyCost: 1750,
    modules: JSON.stringify(['accounting','billing','reports']),
    isActive: true,
  };

  let spValue = JSON.stringify([{ code: 'PREMIUM', quantity: 1 }, { code: 'GROWTH', quantity: 1 }]);
  try { const p = JSON.parse(body.subscriptionPlans); spValue = JSON.stringify(p); } catch(e) {}

  const tenantRow = { updatedat: new Date().toISOString() };
  for (const [c, s] of Object.entries(fieldMap)) {
    if (c === 'subscriptionPlans') tenantRow[s] = spValue;
    else if (body[c] !== undefined) tenantRow[s] = body[c];
  }

  console.log('Row:', Object.entries(tenantRow).map(([k,v]) => `${k}=${typeof v === 'object'?JSON.stringify(v):v}`).join(', '));

  const { error: err, data } = await admin
    .from('Tenant')
    .update(tenantRow)
    .eq('id', 'dent-bas-002')
    .select('id, businessname, subscriptionplan, monthlycost, modules, updatedat')
    .single();

  if (err) {
    console.log('✗ FAILED:');
    console.log('  message string:', typeof err.message, err.message);
    console.log('  code:', err.code);
    console.log('  full:', JSON.stringify(err));
    process.exit(1);
  }
  console.log('✓ OK: data =', JSON.stringify(data, null, 2));

  // Test 2: Verify tenant subplans parseable
  try { const sp = JSON.parse(data.subscriptionplan || '["PREMIUM"]'); console.log('✓ subscriptionplan parses to', JSON.stringify(sp)); }
  catch(e) { console.log('✗ subscriptionplan parse failed'); process.exit(1); }
}

main().catch(e => console.error(e.message)).then(() => process.exit(0));
