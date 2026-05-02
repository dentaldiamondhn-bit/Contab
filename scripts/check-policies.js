const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPolicies() {
  try {
    console.log('🔍 Checking existing RLS policies...');
    
    // Verificar políticas existentes usando SQL directo
    const { data, error } = await supabase
      .rpc('exec_sql', { 
        sql_query: `
          SELECT 
            schemaname,
            tablename,
            policyname,
            permissive,
            roles,
            cmd,
            qual
          FROM pg_policies 
          WHERE schemaname = 'public'
          ORDER BY tablename, policyname
        `
      });
    
    if (error) {
      console.log('⚠️  Cannot check policies via RPC, trying manual check...');
      
      // Verificar si RLS está habilitado en tablas principales
      const tables = ['Tenant', 'User', 'Account'];
      
      for (const table of tables) {
        try {
          const { data: tableData, error: tableError } = await supabase
            .from(table)
            .select('*')
            .limit(1);
          
          if (tableError) {
            console.log(`❌ ${table}: ${tableError.message}`);
          } else {
            console.log(`✅ ${table}: Accessible (RLS may be enabled)`);
          }
        } catch (err) {
          console.log(`⚠️  ${table}: ${err.message}`);
        }
      }
    } else {
      console.log('✅ Existing policies:', data);
    }
    
    // Verificar si las funciones existen
    console.log('\n🔍 Checking functions...');
    
    try {
      const { data: funcData, error: funcError } = await supabase
        .rpc('get_current_tenant_id');
      
      if (funcError) {
        console.log('❌ get_current_tenant_id function:', funcError.message);
      } else {
        console.log('✅ get_current_tenant_id function exists');
      }
    } catch (err) {
      console.log('⚠️  get_current_tenant_id function check:', err.message);
    }
    
  } catch (error) {
    console.error('❌ Error checking policies:', error.message);
  }
}

checkPolicies();
