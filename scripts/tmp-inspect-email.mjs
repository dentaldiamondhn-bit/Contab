import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en .env.local');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const EMAIL = process.argv[2] || 'azuna22@outlook.com';

function line(t) { console.log('\n===== ' + t + ' ====='); }

line('User (email = ' + EMAIL + ')');
const { data: users, error: usersErr } = await supabase
  .from('User')
  .select('id, email, role, tenantid, authid, createdat')
  .ilike('email', EMAIL);
if (usersErr) console.error('User error:', usersErr);
console.log(users);

line('users (lowercase) (email = ' + EMAIL + ')');
const { data: usersLower, error: usersLowerErr } = await supabase
  .from('users')
  .select('*')
  .ilike('email', EMAIL);
if (usersLowerErr) console.error('users error:', usersLowerErr);
console.log(usersLower);

const tenantIds = [...new Set((users || []).map(u => u.tenantid).filter(Boolean))];

line('Tenants referenciados por User.tenantid: ' + JSON.stringify(tenantIds));
if (tenantIds.length) {
  const { data: t1 } = await supabase.from('Tenant').select('*').in('id', tenantIds);
  console.log(t1);
  const { data: c1 } = await supabase.from('companies').select('id, name, rtn, tenant_id, industry, created_at').in('tenant_id', tenantIds);
  console.log('companies:', c1);
}

line('TODOS los tenants');
const { data: allTenants } = await supabase
  .from('Tenant')
  .select('id, businessname, business_name, tenant_code, created_at');
console.log(allTenants);

line('TODAS las companies que se llamen test 1 / test 2 o parecido');
const { data: testCompanies } = await supabase
  .from('companies')
  .select('id, name, rtn, tenant_id, created_at')
  .ilike('name', 'test%');
console.log(testCompanies);

line('onboarding_companies del/los usuario(s)');
const authIds = [...new Set((users || []).map(u => u.authid).filter(Boolean))];
console.log('authIds:', authIds);
if (authIds.length) {
  const { data: onb, error: onbErr } = await supabase
    .from('onboarding_companies')
    .select('*')
    .in('user_id', authIds);
  if (onbErr) console.error('onboarding error:', onbErr);
  console.log(onb);
}

line('Resumen de tenants con su(s) company(ies)');
const { data: allCompanies } = await supabase
  .from('companies')
  .select('id, name, tenant_id');
const byTenant = {};
(allCompanies || []).forEach(c => {
  byTenant[c.tenant_id] = byTenant[c.tenant_id] || [];
  byTenant[c.tenant_id].push(c.name);
});
(allTenants || []).forEach(t => {
  console.log(`${t.id} | ${t.businessname || t.business_name} | companies=[${(byTenant[t.id] || []).join(', ')}]`);
});

process.exit(0);
