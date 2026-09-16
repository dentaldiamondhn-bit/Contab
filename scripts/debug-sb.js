require('dotenv').config({path:'C:/Proyectos/contab/.env.local'});
const { supabase } = require('./lib/supabase-db');

async function test() {
  try {
    const { data, error } = await supabase.from('period_locks').select('*').limit(5);
    console.log('supabase-db.ts proxy test:');
    console.log('Error:', error?.message);
    console.log('Data rows:', data?.length);
    
    // Also test with the exact same query the API uses
    const { data: d2, error: e2 } = await supabase.from('period_locks').select('*').eq('tenant_id', 'ANGELOH7');
    console.log('With tenant_id filter:', e2?.message, 'rows:', d2?.length);
  } catch (e) {
    console.error('Proxy error:', e.message);
  }
}

test();
