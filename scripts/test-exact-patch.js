const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Check dent-bas-002 current state
  const { data: tenant, error: tErr } = await supabase
    .from('Tenant')
    .select('*')
    .eq('id', 'dent-bas-002')
    .single();
  if (tErr) { console.error('Failed to read tenant:', tErr.message); process.exit(1); }

  console.log('Tenant columns in DB response:', Object.keys(tenant));
  console.log('tenant.tenant_code =', JSON.stringify(tenant.tenant_code));
  console.log('tenant.subscriptionplan =', JSON.stringify(tenant.subscriptionplan));
  console.log('tenant.monthlycost =', JSON.stringify(tenant.monthlycost));
  console.log('tenant.modules =', JSON.stringify(tenant.modules));
  console.log('tenant.isactive =', JSON.stringify(tenant.isactive));
  console.log('tenant.createdat =', JSON.stringify(tenant.createdat));
  console.log('tenant.updatedat =', JSON.stringify(tenant.updatedat));

  // Simulate exact fieldMap output the PATCH would build
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

  const mockFormData = {
    businessName: 'Dental Basic 002',
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

  const tenantRow = { updatedat: new Date().toISOString() };
  for (const [camel, snake] of Object.entries(fieldMap)) {
    if (camel === 'subscriptionPlans') {
      tenantRow[snake] = mockFormData.subscriptionPlans;
    } else if (mockFormData[camel] !== undefined) {
      tenantRow[snake] = mockFormData[camel];
    }
  }

  console.log('\nTenant row to update:');
  Object.entries(tenantRow).forEach(([k, v]) => console.log(` ${k}: ${JSON.stringify(v)}`));

  const { error: updErr } = await supabase
    .from('Tenant')
    .update(tenantRow)
    .eq('id', 'dent-bas-002')
    .single();
  console.log('\nUpdate result:', updErr ? 'FAILED: ' + updErr.message : 'OK');

  if (updErr) {
    console.error('  code:', updErr.code);
    console.error('  details:', updErr.details);
    console.error('  hint:', updErr.hint);
    process.exit(1);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); }).then(() => process.exit(0));
