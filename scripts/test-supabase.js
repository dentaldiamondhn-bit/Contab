const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Probar conexión
async function testConnection() {
  try {
    console.log('🔄 Testing Supabase connection...');
    
    // Intentar listar tablas
    const { data, error } = await supabase
      .from('Tenant')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase error:', error);
    } else {
      console.log('✅ Supabase connection successful!');
      console.log('📊 Data:', data);
    }
    
    // Probar crear tabla si no existe
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_info', { table_name: 'Tenant' })
      .catch(() => ({ data: null, error: { message: 'RPC not available' } }));
    
    if (tablesError) {
      console.log('🔍 Tables might not exist yet, need to create schema');
    }
    
  } catch (err) {
    console.error('❌ Connection error:', err.message);
  }
}

testConnection();
