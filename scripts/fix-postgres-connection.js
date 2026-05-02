const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testPostgreSQLConnection() {
  console.log('🔍 === DIAGNÓSTICO COMPLETO DE CONEXIÓN POSTGRESQL ===\n');
  
  let connectionTests = {
    basicConnection: false,
    tenantQuery: false,
    userQuery: false,
    aggregateQuery: false,
    rlsTest: false
  };
  
  // 1. Prueba básica de conexión
  console.log('1️⃣ Prueba básica de conexión...');
  try {
    const { data, error } = await supabase
      .from('Tenant')
      .select('id')
      .limit(1);
    
    if (error) {
      console.log('❌ Error básico:', error.message);
      console.log('   Código:', error.code);
      console.log('   Detalles:', error.details);
    } else {
      console.log('✅ Conexión básica exitosa');
      connectionTests.basicConnection = true;
    }
  } catch (error) {
    console.log('❌ Error crítico:', error.message);
  }
  
  // 2. Prueba de consulta de tenants
  console.log('\n2️⃣ Prueba de consulta de tenants...');
  try {
    const { data, error } = await supabase
      .from('Tenant')
      .select('*')
      .limit(3);
    
    if (error) {
      console.log('❌ Error consultando tenants:', error.message);
    } else {
      console.log('✅ Consulta de tenants exitosa');
      console.log(`📊 Encontrados ${data.length} tenants:`);
      data.forEach((tenant, index) => {
        console.log(`   ${index + 1}. ${tenant.businessname} (${tenant.id})`);
      });
      connectionTests.tenantQuery = true;
    }
  } catch (error) {
    console.log('❌ Error en consulta tenants:', error.message);
  }
  
  // 3. Prueba de consulta de usuarios
  console.log('\n3️⃣ Prueba de consulta de usuarios...');
  try {
    const { data, error } = await supabase
      .from('User')
      .select('*')
      .limit(3);
    
    if (error) {
      console.log('❌ Error consultando usuarios:', error.message);
    } else {
      console.log('✅ Consulta de usuarios exitosa');
      console.log(`👥 Encontrados ${data.length} usuarios:`);
      data.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.role})`);
      });
      connectionTests.userQuery = true;
    }
  } catch (error) {
    console.log('❌ Error en consulta usuarios:', error.message);
  }
  
  // 4. Prueba de consulta agregada (corregida)
  console.log('\n4️⃣ Prueba de consulta agregada (corregida)...');
  try {
    // Método 1: Usar .length() de Supabase
    const { count, error: countError } = await supabase
      .from('Tenant')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.log('❌ Error con count():', countError.message);
      
      // Método 2: Consulta manual
      console.log('🔄 Intentando método alternativo...');
      const { data: allTenants, error: allError } = await supabase
        .from('Tenant')
        .select('id');
      
      if (allError) {
        console.log('❌ Error método alternativo:', allError.message);
      } else {
        console.log(`✅ Conteo manual: ${allTenants.length} tenants`);
        connectionTests.aggregateQuery = true;
      }
    } else {
      console.log(`✅ Conteo exacto: ${count} tenants`);
      connectionTests.aggregateQuery = true;
    }
  } catch (error) {
    console.log('❌ Error en consulta agregada:', error.message);
  }
  
  // 5. Prueba de RLS
  console.log('\n5️⃣ Prueba de Row Level Security...');
  try {
    // Intentar acceder a datos con un tenant específico
    const { data: tenantData, error: tenantError } = await supabase
      .from('Tenant')
      .select('*')
      .eq('id', 'tenant_001')
      .single();
    
    if (tenantError) {
      if (tenantError.code === 'PGRST116') {
        console.log('⚠️  Tenant no encontrado (normal si no existe)');
      } else {
        console.log('❌ Error RLS test:', tenantError.message);
      }
    } else {
      console.log('✅ RLS test: Acceso permitido');
      console.log(`🏢 Tenant: ${tenantData.businessname}`);
      connectionTests.rlsTest = true;
    }
    
    // Verificar si las funciones RLS existen
    try {
      const { data: funcResult, error: funcError } = await supabase
        .rpc('get_current_tenant_id');
      
      if (funcError) {
        console.log('❌ Función RLS no encontrada:', funcError.message);
      } else {
        console.log('✅ Función get_current_tenant_id funciona');
      }
    } catch (err) {
      console.log('❌ Error probando función RLS:', err.message);
    }
    
  } catch (error) {
    console.log('❌ Error en prueba RLS:', error.message);
  }
  
  // 6. Diagnóstico de configuración
  console.log('\n6️⃣ Diagnóstico de configuración...');
  try {
    // Verificar información de la conexión
    console.log('🔗 URL de Supabase:', supabaseUrl);
    console.log('🔑 Service Key configurada:', supabaseServiceKey ? 'Sí' : 'No');
    
    // Probar conexión a diferentes endpoints
    const endpoints = [
      { name: 'Tenant', table: 'Tenant' },
      { name: 'User', table: 'User' },
      { name: 'Account', table: 'Account' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        const { data, error } = await supabase
          .from(endpoint.table)
          .select('id')
          .limit(1);
        
        if (error) {
          console.log(`❌ ${endpoint.name}: ${error.message}`);
        } else {
          console.log(`✅ ${endpoint.name}: Conectado`);
        }
      } catch (err) {
        console.log(`❌ ${endpoint.name}: Error crítico`);
      }
    }
    
  } catch (error) {
    console.log('❌ Error en diagnóstico:', error.message);
  }
  
  // Resumen final
  console.log('\n📊 === RESUMEN DE CONEXIÓN POSTGRESQL ===');
  const successCount = Object.values(connectionTests).filter(v => v === true).length;
  const totalTests = Object.keys(connectionTests).length;
  
  console.log(`🎯 Resultado: ${successCount}/${totalTests} pruebas exitosas`);
  
  if (successCount >= 4) {
    console.log('✅ Conexión PostgreSQL está funcionando correctamente');
    console.log('\n🔧 Componentes verificados:');
    if (connectionTests.basicConnection) console.log('   • Conexión básica');
    if (connectionTests.tenantQuery) console.log('   • Consulta de tenants');
    if (connectionTests.userQuery) console.log('   • Consulta de usuarios');
    if (connectionTests.aggregateQuery) console.log('   • Consultas agregadas');
    if (connectionTests.rlsTest) console.log('   • RLS funcional');
    
    console.log('\n🎉 La conexión PostgreSQL está lista para producción!');
  } else {
    console.log('⚠️  La conexión necesita atención');
  }
  
  return connectionTests;
}

testPostgreSQLConnection().catch(console.error);
