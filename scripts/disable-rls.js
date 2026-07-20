const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function disableRLS() {
  try {
    console.log('🔧 Disabling RLS for CustomTaxes table...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE "CustomTaxes" DISABLE ROW LEVEL SECURITY;'
    });
    
    if (error) {
      console.error('❌ Error disabling RLS:', error);
      console.log('🔄 Trying direct SQL execution...');
      
      // Fallback: Try direct table operation
      const { data: testData, error: testError } = await supabase
        .from('CustomTaxes')
        .select('count')
        .single();
        
      if (testError) {
        console.error('❌ Table access error:', testError);
      } else {
        console.log('✅ Table accessible, RLS might be disabled');
      }
    } else {
      console.log('✅ RLS disabled successfully');
      console.log('📊 Result:', data);
    }
  } catch (err) {
    console.error('💥 Critical error:', err);
  }
}

disableRLS();
