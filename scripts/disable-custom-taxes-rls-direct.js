const { createClient } = require('@supabase/supabase-js');
const { claveServiceRole, supabaseEnv } = require('./_supabase-env');

const supabaseUrl = supabaseEnv().url;
const supabaseKey = claveServiceRole();

const supabase = createClient(supabaseUrl, supabaseKey);

async function disableRLS() {
  try {
    console.log('🔧 Attempting to disable RLS for CustomTaxes table...');
    
    // Try to drop RLS policies first
    const policies = [
      'Tenants can read own custom taxes',
      'Tenants can insert own custom taxes', 
      'Tenants can update own custom taxes',
      'Tenants can delete own custom taxes'
    ];
    
    for (const policy of policies) {
      console.log(`🗑️ Dropping policy: ${policy}`);
      const { error: dropError } = await supabase.rpc('exec_sql', {
        sql: `DROP POLICY IF EXISTS "${policy}" ON "CustomTaxes";`
      });
      
      if (dropError) {
        console.error(`❌ Error dropping policy ${policy}:`, dropError);
      } else {
        console.log(`✅ Policy ${policy} dropped successfully`);
      }
    }
    
    // Disable RLS
    console.log('🔒 Disabling RLS on CustomTaxes table...');
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE "CustomTaxes" DISABLE ROW LEVEL SECURITY;'
    });
    
    if (rlsError) {
      console.error('❌ Error disabling RLS:', rlsError);
    } else {
      console.log('✅ RLS disabled successfully');
    }
    
    // Test if table is now accessible
    console.log('🧪 Testing table access...');
    const { data: testData, error: testError } = await supabase
      .from('CustomTaxes')
      .select('count')
      .single();
      
    if (testError) {
      console.error('❌ Table access test failed:', testError);
    } else {
      console.log('✅ Table is now accessible! Count:', testData);
    }
    
  } catch (err) {
    console.error('💥 Critical error:', err);
  }
}

disableRLS();
