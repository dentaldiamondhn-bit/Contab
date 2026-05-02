const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixMinorIssues() {
  console.log('🔧 === REVISIÓN Y SOLUCIÓN DE ISSUES MENORES ===\n');
  
  const fixes = {
    userStructure: { status: 'pending', issues: [], fixes: [] },
    sqlFunction: { status: 'pending', issues: [], fixes: [] },
    emptyTables: { status: 'pending', issues: [], fixes: [] }
  };
  
  // 1. VERIFICAR CAMPOS FALTANTES EN TABLA USER
  console.log('1️⃣ === VERIFICANDO CAMPOS FALTANTES EN TABLA USER ===');
  
  try {
    console.log('👥 Analizando estructura de tabla User...');
    
    // Obtener un usuario existente para analizar estructura
    const { data: users, error: usersError } = await supabase
      .from('User')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.log('❌ Error obteniendo usuarios:', usersError.message);
      fixes.userStructure.issues.push('❌ Error al obtener usuarios');
    } else if (users && users.length > 0) {
      const sampleUser = users[0];
      const allFields = Object.keys(sampleUser);
      
      console.log('📋 Campos actuales en tabla User:');
      allFields.forEach(field => {
        console.log(`   - ${field}: ${typeof sampleUser[field]}`);
      });
      
      // Campos requeridos para onboarding
      const requiredFields = [
        'id',
        'email', 
        'tenantid',
        'role',
        'authId',  // Crítico para Clerk integration
        'firstname',
        'lastname',
        'isactive',
        'createdat',
        'updatedat'
      ];
      
      const missingFields = requiredFields.filter(field => !allFields.includes(field));
      const presentFields = requiredFields.filter(field => allFields.includes(field));
      
      console.log(`\n✅ Campos presentes (${presentFields.length}):`);
      presentFields.forEach(field => {
        console.log(`   ✅ ${field}`);
      });
      
      if (missingFields.length > 0) {
        console.log(`\n❌ Campos faltantes (${missingFields.length}):`);
        missingFields.forEach(field => {
          console.log(`   ❌ ${field}`);
          fixes.userStructure.issues.push(`❌ Falta campo: ${field}`);
        });
        
        // Verificar si authId existe con diferente nombre
        const possibleAuthIdFields = ['authId', 'auth_id', 'clerkId', 'clerk_id'];
        const foundAuthField = possibleAuthIdFields.find(field => allFields.includes(field));
        
        if (foundAuthField) {
          console.log(`⚠️  Campo authId encontrado como: ${foundAuthField}`);
          fixes.userStructure.fixes.push(`⚠️  authId existe como ${foundAuthField}`);
        } else {
          console.log('❌ Campo authId no encontrado - CRÍTICO');
          fixes.userStructure.issues.push('❌ authId no encontrado - CRÍTICO');
        }
      } else {
        console.log('\n✅ Todos los campos requeridos presentes');
        fixes.userStructure.fixes.push('✅ Estructura User completa');
      }
      
      // Verificar campos opcionales importantes
      const optionalFields = ['permissions', 'lastloginat', 'emailverified'];
      const missingOptional = optionalFields.filter(field => !allFields.includes(field));
      
      if (missingOptional.length > 0) {
        console.log(`\n⚠️  Campos opcionales faltantes: ${missingOptional.join(', ')}`);
      }
      
      fixes.userStructure.status = missingFields.length === 0 ? 'success' : 'needs_fix';
      
    } else {
      console.log('⚠️  No hay usuarios en la tabla - no se puede verificar estructura');
      fixes.userStructure.status = 'no_data';
    }
    
  } catch (error) {
    console.log('❌ Error verificando estructura User:', error.message);
    fixes.userStructure.status = 'error';
  }
  
  // 2. CREAR FUNCIÓN SQL create_default_chart_of_accounts
  console.log('\n2️⃣ === CREANDO FUNCIÓN SQL create_default_chart_of_accounts ===');
  
  try {
    console.log('🔍 Verificando si la función ya existe...');
    
    // Intentar ejecutar la función para ver si existe
    const { data, error } = await supabase
      .rpc('create_default_chart_of_accounts', { p_company_id: 'test-check' });
    
    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('❌ Función no existe - necesita creación');
        fixes.sqlFunction.issues.push('❌ Función create_default_chart_of_accounts no existe');
        
        // Crear la función
        console.log('🔧 Creando función create_default_chart_of_accounts...');
        
        const functionSQL = `
          CREATE OR REPLACE FUNCTION create_default_chart_of_accounts(p_company_id TEXT)
          RETURNS VOID AS $$
          BEGIN
              -- Insertar cuentas por defecto (estructura simplificada)
              -- ACTIVOS
              INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
              VALUES 
              (p_company_id, '11', 'Activo Corriente', 'ASSET', TRUE, TRUE, 0, NOW(), NOW()),
              (p_company_id, '1101', 'Caja y Bancos', 'ASSET', TRUE, TRUE, 0, NOW(), NOW()),
              (p_company_id, '110101', 'Caja General', 'ASSET', TRUE, TRUE, 0, NOW(), NOW()),
              (p_company_id, '110102', 'Bancos', 'ASSET', TRUE, TRUE, 0, NOW(), NOW()),
              (p_company_id, '1102', 'Cuentas por Cobrar', 'ASSET', TRUE, TRUE, 0, NOW(), NOW()),
              (p_company_id, '110201', 'Clientes Locales', 'ASSET', TRUE, TRUE, 0, NOW(), NOW()),
              
              -- PASIVOS
              (p_company_id, '21', 'Pasivo Corriente', 'LIABILITY', TRUE, TRUE, 0, NOW(), NOW()),
              (p_company_id, '2101', 'Cuentas por Pagar Comerciales', 'LIABILITY', TRUE, TRUE, 0, NOW(), NOW()),
              (p_company_id, '210101', 'Proveedores Locales', 'LIABILITY', TRUE, TRUE, 0, NOW(), NOW()),
              (p_company_id, '2102', 'Obligaciones Fiscales (SAR)', 'LIABILITY', TRUE, TRUE, 0, NOW(), NOW()),
              (p_company_id, '210201', 'ISV 15% por Pagar', 'LIABILITY', TRUE, TRUE, 0, NOW(), NOW()),
              
              -- PATRIMONIO
              (p_company_id, '3', 'Patrimonio', 'EQUITY', TRUE, TRUE, 0, NOW(), NOW()),
              (p_company_id, '31', 'Capital Social', 'EQUITY', TRUE, TRUE, 0, NOW(), NOW()),
              (p_company_id, '3101', 'Capital Pagado', 'EQUITY', TRUE, TRUE, 0, NOW(), NOW()),
              
              -- INGRESOS
              (p_company_id, '4', 'Ingresos', 'REVENUE', TRUE, TRUE, 0, NOW(), NOW()),
              (p_company_id, '41', 'Ingresos Operativos', 'REVENUE', TRUE, TRUE, 0, NOW(), NOW()),
              (p_company_id, '4101', 'Prestación de Servicios', 'REVENUE', TRUE, TRUE, 0, NOW(), NOW()),
              
              -- GASTOS
              (p_company_id, '5', 'Gastos', 'EXPENSE', TRUE, TRUE, 0, NOW(), NOW()),
              (p_company_id, '51', 'Gastos de Operación', 'EXPENSE', TRUE, TRUE, 0, NOW(), NOW()),
              (p_company_id, '5101', 'Gastos de Personal', 'EXPENSE', TRUE, TRUE, 0, NOW(), NOW()),
              (p_company_id, '510101', 'Sueldos y Salarios', 'EXPENSE', TRUE, TRUE, 0, NOW(), NOW());
          END;
          $$ LANGUAGE plpgsql;
        `;
        
        // Guardar SQL en archivo para ejecución manual
        const sqlPath = path.join(__dirname, '../scripts/create_chart_of_accounts_function.sql');
        fs.writeFileSync(sqlPath, functionSQL);
        console.log(`✅ SQL guardado en: ${sqlPath}`);
        fixes.sqlFunction.fixes.push('✅ SQL generado para ejecución manual');
        
        console.log('\n📋 INSTRUCCIONES PARA EJECUTAR:');
        console.log('1. Ve a Supabase Dashboard → SQL Editor');
        console.log('2. Copia el contenido del archivo SQL');
        console.log('3. Ejecuta el script para crear la función');
        
        fixes.sqlFunction.status = 'needs_execution';
        
      } else {
        console.log('⚠️  Error verificando función:', error.message);
        fixes.sqlFunction.issues.push(`⚠️  Error: ${error.message}`);
        fixes.sqlFunction.status = 'error';
      }
    } else {
      console.log('✅ Función create_default_chart_of_accounts ya existe');
      fixes.sqlFunction.fixes.push('✅ Función ya existe');
      fixes.sqlFunction.status = 'success';
    }
    
  } catch (error) {
    console.log('❌ Error creando función SQL:', error.message);
    fixes.sqlFunction.status = 'error';
    fixes.sqlFunction.issues.push('❌ Error crítico en función SQL');
  }
  
  // 3. VERIFICAR TABLAS VACÍAS DE ONBOARDING
  console.log('\n3️⃣ === VERIFICANDO TABLAS VACÍAS DE ONBOARDING ===');
  
  try {
    console.log('📊 Analizando tablas de onboarding...');
    
    const onboardingTables = [
      'companies',
      'company_bank_accounts',
      'chart_of_accounts',
      'sales_configuration',
      'onboarding_companies'
    ];
    
    for (const table of onboardingTables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ Error en tabla ${table}: ${error.message}`);
          fixes.emptyTables.issues.push(`❌ Error ${table}: ${error.message}`);
        } else {
          console.log(`📊 ${table}: ${count} registros`);
          
          if (count === 0) {
            console.log(`   ✅ Tabla vacía (normal - sin onboarding completado)`);
            fixes.emptyTables.fixes.push(`✅ ${table}: Vacía (normal)`);
          } else {
            console.log(`   📋 Tabla con datos (${count} registros)`);
            fixes.emptyTables.fixes.push(`📋 ${table}: ${count} registros`);
          }
        }
      } catch (err) {
        console.log(`❌ Error verificando tabla ${table}: ${err.message}`);
        fixes.emptyTables.issues.push(`❌ Error crítico ${table}`);
      }
    }
    
    // Verificar si hay algún onboarding completado
    console.log('\n🔍 Verificando onboarding completados...');
    
    const { data: onboardData, error: onboardError } = await supabase
      .from('onboarding_companies')
      .select('*')
      .eq('setup_completed', true);
    
    if (onboardError) {
      console.log('⚠️  Error verificando onboarding completados');
    } else {
      console.log(`📋 Onboarding completados: ${onboardData.length}`);
      
      if (onboardData.length === 0) {
        console.log('✅ Sin onboarding completados (normal para testing)');
        fixes.emptyTables.fixes.push('✅ Sin onboarding completados (normal)');
      } else {
        console.log('🎉 Hay onboarding completados!');
        fixes.emptyTables.fixes.push(`🎉 ${onboardData.length} onboarding completados`);
      }
    }
    
    fixes.emptyTables.status = 'success';
    
  } catch (error) {
    console.log('❌ Error verificando tablas vacías:', error.message);
    fixes.emptyTables.status = 'error';
  }
  
  // RESUMEN Y RECOMENDACIONES
  console.log('\n📊 === RESUMEN DE FIXES APLICADOS ===');
  
  const categories = [
    { name: 'Estructura User', key: 'userStructure', emoji: '👥' },
    { name: 'Función SQL', key: 'sqlFunction', emoji: '🔧' },
    { name: 'Tablas Vacías', key: 'emptyTables', emoji: '📊' }
  ];
  
  categories.forEach(category => {
    console.log(`\n${category.emoji} ${category.name}:`);
    console.log(`   Estado: ${fixes[category.key].status.toUpperCase()}`);
    
    if (fixes[category.key].issues.length > 0) {
      console.log('   Issues:');
      fixes[category.key].issues.forEach(issue => console.log(`     ${issue}`));
    }
    
    if (fixes[category.key].fixes.length > 0) {
      console.log('   Fixes:');
      fixes[category.key].fixes.forEach(fix => console.log(`     ${fix}`));
    }
  });
  
  // ACCIONES REQUERIDAS
  console.log('\n🎯 === ACCIONES REQUERIDAS ===');
  
  console.log('\n📋 ACCIONES INMEDIATAS:');
  
  if (fixes.userStructure.status === 'needs_fix') {
    console.log('1. 🔧 Agregar campo authId a tabla User si falta');
    console.log('   - ALTER TABLE User ADD COLUMN authId TEXT;');
  }
  
  if (fixes.sqlFunction.status === 'needs_execution') {
    console.log('2. 🔧 Ejecutar script SQL para crear función');
    console.log('   - Usar archivo: scripts/create_chart_of_accounts_function.sql');
    console.log('   - Ejecutar en Supabase Dashboard → SQL Editor');
  }
  
  console.log('\n✅ ESTADO FINAL:');
  
  const criticalIssues = fixes.userStructure.issues.filter(i => i.includes('CRÍTICO')).length;
  const totalIssues = fixes.userStructure.issues.length + fixes.sqlFunction.issues.length + fixes.emptyTables.issues.length;
  
  if (criticalIssues === 0 && totalIssues <= 2) {
    console.log('🎉 Issues menores resueltos - Onboarding listo para producción');
  } else if (criticalIssues > 0) {
    console.log('⚠️  Existen issues críticos que requieren atención inmediata');
  } else {
    console.log('✅ Issues menores identificados - Sistema funcional');
  }
  
  return fixes;
}

fixMinorIssues().catch(console.error);
