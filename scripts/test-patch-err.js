const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function main() {
  // Query the actual trigger function definition via ad-hoc stored function
  // We can read pg_proc via RPC-style syntax with any authorization failures
  // but basic info IS accessible to service role even with PostgREST restrictions

  // Force test - try to update a tenant to surface exact error
  console.log('Testing update on dent-bas-002 with minimal payload...');
  const { error: err1, data: d1 } = await supabase
    .from('Tenant')
    .update({ updatedat: new Date().toISOString(), businessname: 'Dent-Bas-002' })
    .eq('id', 'dent-bas-002')
    .select('id, updatedat, businessname, createdat')
    .single();

  if (err1) {
    console.log('ERROR:');
    console.log('  message:', err1.message);
    console.log('  code:',    err1.code);
    console.log('  details:', JSON.stringify(err1.details));
    console.log('  hint:',    err1.hint);
    console.log('  full:',    JSON.stringify(err1));
  } else {
    console.log('OK - tenant updated without error');
    console.log('Returned:', JSON.stringify(d1));
  }
}

main().catch(e => console.error(e.message)).then(() => process.exit(0));
