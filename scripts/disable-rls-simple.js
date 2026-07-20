const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function disableRLS() {
  try {
    console.log('🔧 Testing direct table access...');
    
    // Try to insert a test record to see if RLS is actually blocking
    const testRecord = {
      id: 'test-' + Date.now(),
      tenantId: 'DENTALWD',
      name: 'Test Tax',
      rate: 15,
      enabled: true,
      description: 'Test tax for RLS bypass'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('CustomTaxes')
      .insert(testRecord)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Insert failed (RLS likely active):', insertError);
      
      // If RLS is blocking, we need to modify the API to bypass RLS
      console.log('🔄 RLS is active, API needs to be modified to bypass RLS');
      console.log('💡 Solution: Modify API to use service role key or disable RLS policies');
      
    } else {
      console.log('✅ Insert successful, RLS might be disabled or working');
      console.log('📊 Inserted record:', insertData);
      
      // Clean up test record
      await supabase
        .from('CustomTaxes')
        .delete()
        .eq('id', testRecord.id);
        
      console.log('🧹 Test record cleaned up');
    }
    
  } catch (err) {
    console.error('💥 Critical error:', err);
  }
}

disableRLS();
