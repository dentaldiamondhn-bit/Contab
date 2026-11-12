const req = {
  headers: { get: (n) => n === 'content-type' ? 'application/json' : null },
  json: async () => ({
    businessName: 'Dent-Bas-002',
    businessEmail: 'dent-bas-002@test.com',
    businessRTN: '08011997001234',
    businessAddress: 'Calle 456',
    phoneNumber: '99887766',
    subscriptionPlans: JSON.stringify([{ code: 'PREMIUM', quantity: 1 }, { code: 'GROWTH', quantity: 1 }]),
    maxUsers: 5, maxStorage: 100, maxTransactions: 10000, monthlyCost: 1750,
    modules: '["accounting","billing","reports"]', isActive: true,
  })
};

// Simulate fieldMap + businessRTN pass-through
const fieldMap = {
  businessName: 'businessname', businessEmail: 'businessemail',
  businessRTN: 'businessrtn', businessAddress: 'businessaddress',
  phoneNumber: 'phonenumber', subscriptionPlans: 'subscriptionplan',
  maxUsers: 'maxusers', maxStorage: 'maxstorage',
  maxTransactions: 'maxtransactions', monthlyCost: 'monthlycost',
  modules: 'modules', isActive: 'isactive',
};

let subscriptionPlansValue = JSON.stringify([{ code: 'PREMIUM', quantity: 1 }]);
const body = await req.json();
if (body.subscriptionPlans && typeof body.subscriptionPlans === 'string') {
  try { const p = JSON.parse(body.subscriptionPlans); subscriptionPlansValue = JSON.stringify(p); } catch(e) {}
}

const tenantRow = { updatedat: new Date().toISOString() };
for (const [camel, snake] of Object.entries(fieldMap)) {
  if (camel === 'subscriptionPlans') tenantRow[snake] = subscriptionPlansValue;
  else if (body[camel] !== undefined) tenantRow[snake] = body[camel];
}

console.log('tenantRow keys:', Object.keys(tenantRow));
console.log('tenantRow values:');
Object.entries(tenantRow).forEach(([k, v]) => console.log(`  ${k}: ${typeof v === 'object'?JSON.stringify(v):v}`));
console.log('JSON.stringify(tenantRow):', JSON.stringify(tenantRow).substring(0, 500), '...');
