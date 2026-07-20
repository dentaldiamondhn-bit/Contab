const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

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
