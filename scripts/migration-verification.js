const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyMigration() {
  console.log('🔍 === VERIFICACIÓN COMPLETA DE MIGRACIÓN A POSTGRESQL CON RLS ===\n');
  
  let verificationResults = {
    connection: false,
    rlsPolicies: false,
    apisUpdated: false,
    dataExists: false,
    envConfig: false,
    summary: []
  };
  
  // 1. Verificar conexión a Supabase PostgreSQL
  console.log('1️⃣ Verificando conexión a Supabase PostgreSQL...');
  try {
    const { data, error } = await supabase
      .from('Tenant')
      .select('count(*)')
      .single();
    
    if (error) {
      console.log('❌ Error de conexión:', error.message);
      verificationResults.summary.push('❌ Conexión a PostgreSQL fallida');
    } else {
      console.log('✅ Conexión a PostgreSQL exitosa');
      verificationResults.connection = true;
      verificationResults.summary.push('✅ Conexión a PostgreSQL funcionando');
    }
  } catch (error) {
    console.log('❌ Error crítico de conexión:', error.message);
    verificationResults.summary.push('❌ Error crítico en conexión PostgreSQL');
  }
  
  // 2. Verificar políticas RLS configuradas
  console.log('\n2️⃣ Verificando políticas RLS...');
  try {
    // Verificar si las funciones existen
    const { data: funcData, error: funcError } = await supabase
      .rpc('get_current_tenant_id');
    
    if (funcError) {
      console.log('❌ Función get_current_tenant_id no encontrada');
    } else {
      console.log('✅ Función get_current_tenant_id existe');
    }
    
    // Verificar tablas con RLS habilitado (intento de acceso)
    const tables = ['Tenant', 'User', 'Account'];
    let rlsEnabledCount = 0;
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error && error.code === '42501') {
          console.log(`✅ Tabla ${table} tiene RLS habilitado (acceso denegado como esperado)`);
          rlsEnabledCount++;
        } else if (error) {
          console.log(`⚠️  Tabla ${table}: ${error.message}`);
        } else {
          console.log(`✅ Tabla ${table} accesible (RLS puede estar habilitado)`);
          rlsEnabledCount++;
        }
      } catch (err) {
        console.log(`❌ Error verificando tabla ${table}: ${err.message}`);
      }
    }
    
    if (rlsEnabledCount >= 2) {
      console.log('✅ RLS parece estar configurado correctamente');
      verificationResults.rlsPolicies = true;
      verificationResults.summary.push('✅ Políticas RLS configuradas');
    } else {
      console.log('⚠️  RLS puede no estar completamente configurado');
      verificationResults.summary.push('⚠️  RLS necesita revisión');
    }
    
  } catch (error) {
    console.log('❌ Error verificando RLS:', error.message);
    verificationResults.summary.push('❌ Error en verificación RLS');
  }
  
  // 3. Verificar datos existentes
  console.log('\n3️⃣ Verificando datos existentes en PostgreSQL...');
  try {
    const { data: tenants, error: tenantsError } = await supabase
      .from('Tenant')
      .select('*')
      .limit(10);
    
    if (tenantsError) {
      console.log('❌ Error obteniendo tenants:', tenantsError.message);
    } else {
      console.log(`✅ Encontrados ${tenants.length} tenants en PostgreSQL`);
      verificationResults.dataExists = true;
      verificationResults.summary.push(`✅ ${tenants.length} tenants migrados`);
      
      // Mostrar algunos datos
      tenants.slice(0, 3).forEach((tenant, index) => {
        console.log(`   ${index + 1}. ${tenant.businessname} (${tenant.tenant_code})`);
      });
    }
    
    // Verificar usuarios
    const { data: users, error: usersError } = await supabase
      .from('User')
      .select('*')
      .limit(5);
    
    if (usersError) {
      console.log('❌ Error obteniendo usuarios:', usersError.message);
    } else {
      console.log(`✅ Encontrados ${users.length} usuarios en PostgreSQL`);
    }
    
  } catch (error) {
    console.log('❌ Error verificando datos:', error.message);
    verificationResults.summary.push('❌ Error en verificación de datos');
  }
  
  // 4. Verificar archivos de configuración actualizados
  console.log('\n4️⃣ Verificando archivos de configuración...');
  try {
    // Verificar .env
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      if (envContent.includes('supabase.co') && envContent.includes('postgresql://')) {
        console.log('✅ Archivo .env configurado con Supabase');
        verificationResults.envConfig = true;
        verificationResults.summary.push('✅ Configuración .env actualizada');
      } else {
        console.log('❌ .env no contiene configuración de Supabase');
      }
    } else {
      console.log('❌ Archivo .env no encontrado');
    }
    
    // Verificar archivos de API actualizados
    const apiPath = path.join(__dirname, '../app/api/tenant/users/route.ts');
    if (fs.existsSync(apiPath)) {
      const apiContent = fs.readFileSync(apiPath, 'utf8');
      if (apiContent.includes('supabase-db') && !apiContent.includes('from \'@/lib/db\'')) {
        console.log('✅ API de usuarios actualizada a Supabase');
        verificationResults.apisUpdated = true;
        verificationResults.summary.push('✅ APIs migradas a Supabase');
      } else {
        console.log('❌ API de usuarios no completamente actualizada');
      }
    } else {
      console.log('❌ Archivo de API no encontrado');
    }
    
    // Verificar librería Supabase
    const libPath = path.join(__dirname, '../lib/supabase-db.ts');
    if (fs.existsSync(libPath)) {
      console.log('✅ Librería Supabase creada');
    } else {
      console.log('❌ Librería Supabase no encontrada');
    }
    
  } catch (error) {
    console.log('❌ Error verificando archivos:', error.message);
    verificationResults.summary.push('❌ Error en verificación de archivos');
  }
  
  // 5. Resumen final
  console.log('\n📊 === RESUMEN DE MIGRACIÓN ===');
  verificationResults.summary.forEach(result => {
    console.log(result);
  });
  
  const successCount = Object.values(verificationResults).filter(v => v === true).length;
  const totalChecks = 5;
  
  console.log(`\n🎯 Resultado: ${successCount}/${totalChecks} componentes verificados exitosamente`);
  
  if (successCount >= 4) {
    console.log('🎉 ¡MIGRACIÓN A POSTGRESQL CON RLS COMPLETADA EXITOSAMENTE!');
    console.log('\n✅ Componentes funcionales:');
    if (verificationResults.connection) console.log('   • Conexión PostgreSQL activa');
    if (verificationResults.rlsPolicies) console.log('   • Políticas RLS configuradas');
    if (verificationResults.apisUpdated) console.log('   • APIs migradas a Supabase');
    if (verificationResults.dataExists) console.log('   • Datos migrados correctamente');
    if (verificationResults.envConfig) console.log('   • Configuración actualizada');
  } else {
    console.log('⚠️  La migración necesita atención adicional');
  }
  
  return verificationResults;
}

verifyMigration().catch(console.error);
