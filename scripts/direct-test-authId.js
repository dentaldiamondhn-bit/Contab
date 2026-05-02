const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function directTestAuthId() {
  console.log('🔍 Prueba directa del campo authId...\n');
  
  try {
    // 1. Forzar una consulta fresca
    console.log('1️⃣ Consulta directa con campos específicos...');
    const { data: directData, error: directError } = await supabase
      .from('User')
      .select('id, email, tenantid, role, authId')
      .eq('email', 'admin@contab.com')
      .single();
    
    if (directError) {
      console.log('❌ Error en consulta directa:', directError.message);
      console.log('Código de error:', directError.code);
      console.log('Detalles:', directError.details);
    } else {
      console.log('✅ Consulta directa exitosa:');
      console.log(JSON.stringify(directData, null, 2));
    }
    
    // 2. Intentar con RPC si existe
    console.log('\n2️⃣ Intentando con consulta RPC...');
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_user_with_authid', { user_email: 'admin@contab.com' });
      
      if (rpcError) {
        console.log('❌ RPC no disponible:', rpcError.message);
      } else {
        console.log('✅ RPC exitosa:', rpcData);
      }
    } catch (err) {
      console.log('❌ Error RPC:', err.message);
    }
    
    // 3. Verificar schema de la tabla
    console.log('\n3️⃣ Verificando schema...');
    try {
      const { data: schemaData, error: schemaError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'User')
        .eq('column_name', 'authId');
      
      if (schemaError) {
        console.log('❌ Error verificando schema:', schemaError.message);
      } else {
        console.log('✅ Schema verificado:', schemaData);
      }
    } catch (err) {
      console.log('❌ Error schema:', err.message);
    }
    
    // 4. Prueba con SQL raw si es posible
    console.log('\n4️⃣ Intentando consulta raw...');
    try {
      const { data: rawData, error: rawError } = await supabase
        .from('User')
        .select('*')
        .eq('email', 'admin@contab.com')
        .single();
      
      if (rawError) {
        console.log('❌ Error en consulta raw:', rawError.message);
      } else {
        console.log('✅ Todos los campos del usuario:');
        console.log('Campos disponibles:', Object.keys(rawData));
        
        // Buscar authId en los campos disponibles
        const authIdField = Object.keys(rawData).find(key => 
          key.toLowerCase() === 'authid' || key.toLowerCase() === 'auth_id'
        );
        
        if (authIdField) {
          console.log(`✅ Campo encontrado como: ${authIdField}`);
          console.log(`Valor: ${rawData[authIdField]}`);
        } else {
          console.log('❌ Campo authId no encontrado en ninguna variante');
          console.log('Campos disponibles:', Object.keys(rawData));
        }
      }
    } catch (err) {
      console.log('❌ Error consulta raw:', err.message);
    }
    
  } catch (error) {
    console.log('❌ Error general:', error.message);
  }
}

directTestAuthId().catch(console.error);
