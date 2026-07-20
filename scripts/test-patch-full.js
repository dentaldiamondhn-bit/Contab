const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Exact fieldMap the PATCH handler will build from mock formData
  const fieldMap = {
    businessName:    'businessname',
    businessEmail:   'businessemail',
    businessRTN:     'businessrtn',
    businessAddress: 'businessaddress',
    phoneNumber:    'phonenumber',
    subscriptionPlans: 'subscriptionplan',
    maxUsers:        'maxusers',
    maxStorage:      'maxstorage',
    maxTransactions: 'maxtransactions',
    monthlyCost:     'monthlycost',
    modules:         'modules',
    isActive:        'isactive',
  };

  const body = {
    businessName: 'Dental Bas Test',
    businessEmail: 'dent-bas-002@test.com',
    businessRTN: '08011997001234',
    businessAddress: 'Calle Principal 456',
    phoneNumber: '22345678',
    subscriptionPlans: JSON.stringify([{ code: 'PREMIUM', quantity: 1 }]),
    maxUsers: 5,
    maxStorage: 100,
    maxTransactions: 10000,
    monthlyCost: 0,
    modules: JSON.stringify(['accounting','billing']),
    isActive: true,
  };

  // Normalize like the PATCH handler does
  let subscriptionPlansValue = '["PREMIUM"]';
  if (body.subscriptionPlans) {
    if (typeof body.subscriptionPlans === 'string') {
      try { subscriptionPlansValue = JSON.stringify(JSON.parse(body.subscriptionPlans)); } catch(e) { /* skip */ }
    }
  }

  const tenantRow = { updatedat: new Date().toISOString() };

  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (camel === 'subscriptionPlans') {
      tenantRow[snake] = subscriptionPlansValue;
    } else if (body[camel] !== undefined) {
      tenantRow[snake] = body[camel];
    }
  }

  console.log('tenantRow:');
  Object.entries(tenantRow).forEach(([k, v]) => {
    const vType = typeof v;
    console.log(`  ${k} (${vType}): ${vType === 'object' ? JSON.stringify(v) : v}`);
  });

  // 1. Direct update — OK?
  const { error: err1, data: d1 } = await admin
    .from('Tenant')
    .update(tenantRow)
    .eq('id', 'dent-bas-002')
    .select('id, businessname, subscriptionplan, updatedat, monthlycost, modules')
    .single();

  if (err1) {
    console.log('\n✗ UPDATE FAILED:', err1.message);
    console.log('  code:',    err1.code);
    console.log('  details:', JSON.stringify(err1.details));
    console.log('  hint:',    err1.hint);
    console.log('  full:',    JSON.stringify(err1));
    console.log('  typeof err:', typeof err1);
    process.exit(1);
  }
  console.log('\n✓ UPDATE OK');
  console.log('  id:', d1.id);
  console.log('  businessname:', d1.businessname);
  console.log('  subscriptionplan:', d1.subscriptionplan);
  console.log('  monthlycost:', d1.monthlycost);
  console.log('  modules:', d1.modules);
  console.log('  updatedat:', d1.updatedat);

  // 2. Verify update returned expected values
  try {
    const sp = JSON.parse(d1.subscriptionplan || '["PREMIUM"]');
    console.log('\n✓ JSON.parse(subscriptionplan) OK:', JSON.stringify(sp));
  } catch(e) {
    console.log('\n✗ JSON.parse(subscriptionplan) FAILED');
  }
}

main().catch(e => console.error(e.message)).then(() => process.exit(0));
