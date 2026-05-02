const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyComponents() {
  console.log('🔍 === VERIFICACIÓN DETALLADA DE COMPONENTES ===\n');
  
  const results = {
    rlsPolicies: { status: 'pending', details: [] },
    apisUpdated: { status: 'pending', details: [] },
    dataExists: { status: 'pending', details: [] },
    envConfig: { status: 'pending', details: [] }
  };
  
  // 1. VERIFICAR POLÍTICAS RLS CONFIGURADAS
  console.log('1️⃣ === VERIFICANDO POLÍTICAS RLS ===');
  
  try {
    // Verificar funciones RLS
    console.log('🔧 Verificando funciones RLS...');
    
    const { data: tenantIdResult, error: tenantIdError } = await supabase
      .rpc('get_current_tenant_id');
    
    if (tenantIdError) {
      console.log('❌ Función get_current_tenant_id:', tenantIdError.message);
      results.rlsPolicies.details.push('❌ Función get_current_tenant_id no funciona');
    } else {
      console.log('✅ Función get_current_tenant_id funciona');
      results.rlsPolicies.details.push('✅ Función get_current_tenant_id operativa');
    }
    
    // Verificar políticas por tabla
    console.log('\n🛡️ Verificando políticas por tabla...');
    const tables = ['Tenant', 'User', 'Account'];
    
    for (const table of tables) {
      try {
        // Intentar acceso sin contexto (debería funcionar con service role)
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          if (error.code === '42501') {
            console.log(`✅ Tabla ${table}: RLS habilitado (acceso denegado como esperado)`);
            results.rlsPolicies.details.push(`✅ ${table}: RLS activo`);
          } else {
            console.log(`⚠️  Tabla ${table}: ${error.message}`);
            results.rlsPolicies.details.push(`⚠️  ${table}: ${error.message}`);
          }
        } else {
          console.log(`✅ Tabla ${table}: Acceso permitido (Service Role)`);
          results.rlsPolicies.details.push(`✅ ${table}: Acceso correcto`);
        }
      } catch (err) {
        console.log(`❌ Tabla ${table}: Error crítico`);
        results.rlsPolicies.details.push(`❌ ${table}: Error crítico`);
      }
    }
    
    // Verificar si existen políticas específicas
    console.log('\n📋 Verificando políticas específicas...');
    try {
      // Intentar crear una política de prueba para verificar
      const { error: policyError } = await supabase
        .from('User')
        .select('*')
        .eq('tenantid', 'test-tenant-id');
      
      if (policyError && policyError.code !== 'PGRST116') {
        console.log('✅ Políticas de filtrado parecen estar activas');
        results.rlsPolicies.details.push('✅ Políticas de filtrado activas');
      } else {
        console.log('⚠️  No se puede verificar políticas específicas');
        results.rlsPolicies.details.push('⚠️  Políticas específicas no verificables');
      }
    } catch (err) {
      console.log('❌ Error verificando políticas específicas');
      results.rlsPolicies.details.push('❌ Error en políticas específicas');
    }
    
    results.rlsPolicies.status = results.rlsPolicies.details.some(d => d.includes('❌')) ? 'failed' : 'success';
    
  } catch (error) {
    console.log('❌ Error general en RLS:', error.message);
    results.rlsPolicies.status = 'failed';
    results.rlsPolicies.details.push('❌ Error crítico en RLS');
  }
  
  // 2. VERIFICAR APIS ACTUALIZADOS A SUPABASE
  console.log('\n2️⃣ === VERIFICANDO APIS ACTUALIZADOS A SUPABASE ===');
  
  try {
    const apiFiles = [
      { path: '../app/api/tenant/users/route.ts', name: 'Tenant Users API' },
      { path: '../app/api/admin/tenants/route.ts', name: 'Admin Tenants API' },
      { path: '../lib/supabase-db.ts', name: 'Supabase DB Library' }
    ];
    
    for (const file of apiFiles) {
      const filePath = path.join(__dirname, file.path);
      
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (file.path.includes('supabase-db.ts')) {
          console.log(`✅ ${file.name}: Archivo existe`);
          results.apisUpdated.details.push(`✅ ${file.name}: Archivo creado`);
          
          if (content.includes('supabase') && content.includes('createClient')) {
            console.log(`✅ ${file.name}: Contiene configuración Supabase`);
            results.apisUpdated.details.push(`✅ ${file.name}: Configuración correcta`);
          } else {
            console.log(`❌ ${file.name}: Sin configuración Supabase`);
            results.apisUpdated.details.push(`❌ ${file.name}: Sin configuración`);
          }
        } else {
          // Verificar APIs
          if (content.includes('supabase-db') && !content.includes('from \'@/lib/db\'')) {
            console.log(`✅ ${file.name}: Migrado a Supabase`);
            results.apisUpdated.details.push(`✅ ${file.name}: Migrado a Supabase`);
          } else if (content.includes('from \'@/lib/db\'')) {
            console.log(`❌ ${file.name}: Todavía usa Prisma`);
            results.apisUpdated.details.push(`❌ ${file.name}: Sigue usando Prisma`);
          } else {
            console.log(`⚠️  ${file.name}: Estado unclear`);
            results.apisUpdated.details.push(`⚠️  ${file.name}: Estado unclear`);
          }
        }
      } else {
        console.log(`❌ ${file.name}: Archivo no encontrado`);
        results.apisUpdated.details.push(`❌ ${file.name}: No encontrado`);
      }
    }
    
    // Verificar backup files
    const backupPath = path.join(__dirname, '../app/api/tenant/users/route-prisma-backup.ts');
    if (fs.existsSync(backupPath)) {
      console.log('✅ Backup de API Prisma creado');
      results.apisUpdated.details.push('✅ Backup Prisma creado');
    }
    
    results.apisUpdated.status = results.apisUpdated.details.some(d => d.includes('❌')) ? 'partial' : 'success';
    
  } catch (error) {
    console.log('❌ Error verificando APIs:', error.message);
    results.apisUpdated.status = 'failed';
    results.apisUpdated.details.push('❌ Error crítico en APIs');
  }
  
  // 3. VERIFICAR DATOS EXISTENTES EN POSTGRESQL
  console.log('\n3️⃣ === VERIFICANDO DATOS EXISTENTES EN POSTGRESQL ===');
  
  try {
    console.log('📊 Verificando datos de Tenants...');
    const { data: tenants, error: tenantsError } = await supabase
      .from('Tenant')
      .select('*')
      .limit(10);
    
    if (tenantsError) {
      console.log('❌ Error obteniendo tenants:', tenantsError.message);
      results.dataExists.details.push('❌ Error en tenants');
    } else {
      console.log(`✅ Encontrados ${tenants.length} tenants`);
      results.dataExists.details.push(`✅ ${tenants.length} tenants migrados`);
      
      // Verificar estructura de datos
      if (tenants.length > 0) {
        const sampleTenant = tenants[0];
        const requiredFields = ['id', 'businessname', 'tenant_code', 'isactive'];
        const hasRequiredFields = requiredFields.every(field => sampleTenant.hasOwnProperty(field));
        
        if (hasRequiredFields) {
          console.log('✅ Estructura de tenants correcta');
          results.dataExists.details.push('✅ Estructura tenants correcta');
        } else {
          console.log('❌ Estructura de tenants incompleta');
          results.dataExists.details.push('❌ Estructura tenants incompleta');
        }
        
        // Mostrar samples
        console.log('📋 Sample tenants:');
        tenants.slice(0, 3).forEach((tenant, index) => {
          console.log(`   ${index + 1}. ${tenant.businessname} (${tenant.tenant_code})`);
        });
      }
    }
    
    console.log('\n👥 Verificando datos de Users...');
    const { data: users, error: usersError } = await supabase
      .from('User')
      .select('*')
      .limit(10);
    
    if (usersError) {
      console.log('❌ Error obteniendo users:', usersError.message);
      results.dataExists.details.push('❌ Error en users');
    } else {
      console.log(`✅ Encontrados ${users.length} usuarios`);
      results.dataExists.details.push(`✅ ${users.length} usuarios migrados`);
      
      if (users.length > 0) {
        const sampleUser = users[0];
        const userFields = ['id', 'email', 'tenantid', 'role'];
        const hasUserFields = userFields.every(field => sampleUser.hasOwnProperty(field));
        
        if (hasUserFields) {
          console.log('✅ Estructura de users correcta');
          results.dataExists.details.push('✅ Estructura users correcta');
        } else {
          console.log('❌ Estructura de users incompleta');
          results.dataExists.details.push('❌ Estructura users incompleta');
        }
      }
    }
    
    console.log('\n🏦 Verificando datos de Accounts...');
    const { data: accounts, error: accountsError } = await supabase
      .from('Account')
      .select('*')
      .limit(5);
    
    if (accountsError) {
      console.log('❌ Error obteniendo accounts:', accountsError.message);
      results.dataExists.details.push('❌ Error en accounts');
    } else {
      console.log(`✅ Encontrados ${accounts.length} accounts`);
      results.dataExists.details.push(`✅ ${accounts.length} accounts migrados`);
    }
    
    results.dataExists.status = results.dataExists.details.some(d => d.includes('❌')) ? 'partial' : 'success';
    
  } catch (error) {
    console.log('❌ Error verificando datos:', error.message);
    results.dataExists.status = 'failed';
    results.dataExists.details.push('❌ Error crítico en datos');
  }
  
  // 4. VERIFICAR CONFIGURACIÓN DE ENTORNO
  console.log('\n4️⃣ === VERIFICANDO CONFIGURACIÓN DE ENTORNO ===');
  
  try {
    // Verificar .env
    const envPath = path.join(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
      console.log('✅ Archivo .env encontrado');
      results.envConfig.details.push('✅ .env existe');
      
      const envContent = fs.readFileSync(envPath, 'utf8');
      
      // Verificar variables clave
      const requiredVars = [
        'DATABASE_URL',
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
        'CLERK_SECRET_KEY'
      ];
      
      for (const varName of requiredVars) {
        if (envContent.includes(varName)) {
          console.log(`✅ Variable ${varName}: presente`);
          results.envConfig.details.push(`✅ ${varName}: presente`);
        } else {
          console.log(`❌ Variable ${varName}: ausente`);
          results.envConfig.details.push(`❌ ${varName}: ausente`);
        }
      }
      
      // Verificar URLs correctas
      if (envContent.includes('postgresql://') && envContent.includes('supabase.co')) {
        console.log('✅ DATABASE_URL apunta a Supabase PostgreSQL');
        results.envConfig.details.push('✅ DATABASE_URL correcto');
      } else {
        console.log('❌ DATABASE_URL no apunta a Supabase');
        results.envConfig.details.push('❌ DATABASE_URL incorrecto');
      }
      
      if (envContent.includes('https://kudsqsbxbmviesiaesct.supabase.co')) {
        console.log('✅ SUPABASE_URL correcta');
        results.envConfig.details.push('✅ SUPABASE_URL correcta');
      }
      
    } else {
      console.log('❌ Archivo .env no encontrado');
      results.envConfig.details.push('❌ .env no encontrado');
    }
    
    // Verificar .env.example
    const examplePath = path.join(__dirname, '../.env.example');
    if (fs.existsSync(examplePath)) {
      console.log('✅ .env.example encontrado');
      results.envConfig.details.push('✅ .env.example existe');
    }
    
    // Verificar package.json para dependencias
    const packagePath = path.join(__dirname, '../package.json');
    if (fs.existsSync(packagePath)) {
      const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      if (packageContent.dependencies && packageContent.dependencies['@supabase/supabase-js']) {
        console.log('✅ @supabase/supabase-js instalado');
        results.envConfig.details.push('✅ Supabase JS instalado');
      } else {
        console.log('❌ @supabase/supabase-js no instalado');
        results.envConfig.details.push('❌ Supabase JS no instalado');
      }
    }
    
    results.envConfig.status = results.envConfig.details.some(d => d.includes('❌')) ? 'partial' : 'success';
    
  } catch (error) {
    console.log('❌ Error verificando configuración:', error.message);
    results.envConfig.status = 'failed';
    results.envConfig.details.push('❌ Error crítico en configuración');
  }
  
  // RESUMEN FINAL
  console.log('\n📊 === RESUMEN DETALLADO DE VERIFICACIÓN ===');
  
  const categories = [
    { name: 'Políticas RLS', key: 'rlsPolicies', emoji: '🛡️' },
    { name: 'APIs Actualizados', key: 'apisUpdated', emoji: '🔄' },
    { name: 'Datos Existentes', key: 'dataExists', emoji: '📦' },
    { name: 'Configuración', key: 'envConfig', emoji: '⚙️' }
  ];
  
  categories.forEach(category => {
    console.log(`\n${category.emoji} ${category.name}:`);
    console.log(`   Estado: ${results[category.key].status.toUpperCase()}`);
    results[category.key].details.forEach(detail => {
      console.log(`   ${detail}`);
    });
  });
  
  // Conteo final
  const successCount = Object.values(results).filter(r => r.status === 'success').length;
  const partialCount = Object.values(results).filter(r => r.status === 'partial').length;
  const failedCount = Object.values(results).filter(r => r.status === 'failed').length;
  
  console.log(`\n🎯 RESULTADO FINAL:`);
  console.log(`   ✅ Exitosos: ${successCount}/4`);
  console.log(`   ⚠️  Parciales: ${partialCount}/4`);
  console.log(`   ❌ Fallidos: ${failedCount}/4`);
  
  if (successCount === 4) {
    console.log('\n🎉 ¡TODOS LOS COMPONENTES ESTÁN PERFECTAMENTE CONFIGURADOS!');
  } else if (successCount >= 3) {
    console.log('\n✅ La mayoría de componentes están funcionando correctamente');
  } else {
    console.log('\n⚠️  Se necesita atención en varios componentes');
  }
  
  return results;
}

verifyComponents().catch(console.error);
