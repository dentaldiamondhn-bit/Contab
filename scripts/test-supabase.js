const { createClient } = require('@supabase/supabase-js');
const { claveServiceRole, supabaseEnv } = require('./_supabase-env');

// Configuración de Supabase
const supabaseUrl = supabaseEnv().url;
const supabaseServiceKey = claveServiceRole();

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
