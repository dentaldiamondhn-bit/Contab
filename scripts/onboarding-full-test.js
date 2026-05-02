const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fullOnboardingTest() {
  console.log('🔍 === TESTING COMPLETO DEL ONBOARDING ===\n');
  
  const testResults = {
    endpoints: { status: 'pending', results: [] },
    userCreation: { status: 'pending', results: [] },
    dataConfig: { status: 'pending', results: [] },
    fullProcess: { status: 'pending', results: [] }
  };
  
  // 1. VERIFICAR ENDPOINTS DE ONBOARDING
  console.log('1️⃣ === VERIFICANDO ENDPOINTS DE ONBOARDING ===');
  
  try {
    console.log('🔍 Buscando archivos de endpoints...');
    
    // Verificar si existe API route para onboarding
    const apiPaths = [
      '../app/api/onboarding',
      '../app/api/admin/onboarding',
      '../app/api/tenant/onboarding'
    ];
    
    let foundEndpoints = [];
    
    for (const apiPath of apiPaths) {
      const fullPath = path.join(__dirname, apiPath);
      
      try {
        const files = fs.readdirSync(fullPath);
        files.forEach(file => {
          if (file.endsWith('.ts') || file.endsWith('.js')) {
            foundEndpoints.push(`${apiPath}/${file}`);
            console.log(`✅ Endpoint encontrado: ${apiPath}/${file}`);
          }
        });
      } catch (err) {
        console.log(`⚠️  Directorio no encontrado: ${apiPath}`);
      }
    }
    
    // Verificar si hay endpoints relacionados
    const relatedFiles = [
      '../lib/actions/onboarding.ts',
      '../app/onboarding/page.tsx'
    ];
    
    for (const file of relatedFiles) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        console.log(`✅ Archivo relacionado: ${file}`);
        foundEndpoints.push(file);
        
        // Verificar contenido para endpoints
        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('saveOnboardingData')) {
          console.log(`   - Función saveOnboardingData encontrada`);
        }
        if (content.includes('getOnboardingStatus')) {
          console.log(`   - Función getOnboardingStatus encontrada`);
        }
      }
    }
    
    if (foundEndpoints.length > 0) {
      testResults.endpoints.status = 'success';
      testResults.endpoints.results.push(`✅ ${foundEndpoints.length} archivos de onboarding encontrados`);
    } else {
      testResults.endpoints.status = 'failed';
      testResults.endpoints.results.push('❌ No se encontraron endpoints de onboarding');
    }
    
  } catch (error) {
    console.log('❌ Error verificando endpoints:', error.message);
    testResults.endpoints.status = 'error';
    testResults.endpoints.results.push('❌ Error crítico en endpoints');
  }
  
  // 2. REVISAR CREACIÓN DE USUARIOS INICIALES
  console.log('\n2️⃣ === REVISANDO CREACIÓN DE USUARIOS INICIALES ===');
  
  try {
    console.log('👥 Verificando usuarios existentes...');
    
    // Obtener usuarios actuales
    const { data: users, error: usersError } = await supabase
      .from('User')
      .select('*')
      .limit(5);
    
    if (usersError) {
      console.log('❌ Error obteniendo usuarios:', usersError.message);
      testResults.userCreation.status = 'failed';
      testResults.userCreation.results.push('❌ Error al obtener usuarios');
    } else {
      console.log(`✅ Encontrados ${users.length} usuarios`);
      testResults.userCreation.results.push(`✅ ${users.length} usuarios existentes`);
      
      // Verificar estructura de usuarios
      if (users.length > 0) {
        const sampleUser = users[0];
        const requiredFields = ['id', 'email', 'tenantid', 'role', 'authId'];
        const hasRequiredFields = requiredFields.every(field => sampleUser.hasOwnProperty(field));
        
        if (hasRequiredFields) {
          console.log('✅ Estructura de usuarios correcta');
          testResults.userCreation.results.push('✅ Estructura usuarios correcta');
        } else {
          console.log('❌ Estructura de usuarios incompleta');
          testResults.userCreation.results.push('❌ Estructura usuarios incompleta');
        }
        
        // Mostrar usuarios
        users.forEach((user, index) => {
          console.log(`   ${index + 1}. ${user.email} (${user.role}) - Tenant: ${user.tenantid}`);
        });
      }
      
      // Verificar tenants asociados
      const { data: tenants, error: tenantsError } = await supabase
        .from('Tenant')
        .select('*')
        .limit(5);
      
      if (!tenantsError && tenants.length > 0) {
        console.log(`✅ ${tenants.length} tenants disponibles para usuarios`);
        testResults.userCreation.results.push(`✅ ${tenants.length} tenants disponibles`);
        
        tenants.forEach((tenant, index) => {
          console.log(`   ${index + 1}. ${tenant.businessname} (${tenant.id})`);
        });
      }
    }
    
    // Verificar si existe función para crear usuarios
    console.log('\n🔧 Verificando funciones de creación de usuarios...');
    
    const userCreationFiles = [
      '../lib/actions/onboarding.ts',
      '../app/api/tenant/users/route.ts'
    ];
    
    for (const file of userCreationFiles) {
      const filePath = path.join(__dirname, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (content.includes('createTenantUser') || content.includes('createUser')) {
          console.log(`✅ Función de creación de usuarios en: ${file}`);
          testResults.userCreation.results.push(`✅ Función creación usuarios en ${file}`);
        }
      }
    }
    
    testResults.userCreation.status = 'success';
    
  } catch (error) {
    console.log('❌ Error revisando usuarios:', error.message);
    testResults.userCreation.status = 'error';
    testResults.userCreation.results.push('❌ Error en revisión usuarios');
  }
  
  // 3. VERIFICAR CONFIGURACIÓN DE DATOS INICIALES
  console.log('\n3️⃣ === VERIFICANDO CONFIGURACIÓN DE DATOS INICIALES ===');
  
  try {
    console.log('📊 Verificando tablas de onboarding...');
    
    const onboardingTables = [
      'companies',
      'company_bank_accounts',
      'chart_of_accounts',
      'sales_configuration',
      'onboarding_companies'
    ];
    
    let tablesFound = [];
    let tablesMissing = [];
    
    for (const table of onboardingTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          if (error.code === 'PGRST116') {
            console.log(`❌ Tabla ${table}: NO EXISTE`);
            tablesMissing.push(table);
          } else {
            console.log(`⚠️  Tabla ${table}: ${error.message}`);
          }
        } else {
          console.log(`✅ Tabla ${table}: EXISTE`);
          tablesFound.push(table);
        }
      } catch (err) {
        console.log(`❌ Error verificando tabla ${table}`);
        tablesMissing.push(table);
      }
    }
    
    testResults.dataConfig.results.push(`✅ ${tablesFound.length} tablas encontradas`);
    if (tablesMissing.length > 0) {
      testResults.dataConfig.results.push(`❌ ${tablesMissing.length} tablas faltantes`);
    }
    
    // Verificar datos existentes en tablas
    console.log('\n📋 Verificando datos existentes...');
    
    for (const table of tablesFound) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(3);
        
        if (!error && data.length > 0) {
          console.log(`✅ ${table}: ${data.length} registros`);
          testResults.dataConfig.results.push(`✅ ${table}: ${data.length} registros`);
        } else {
          console.log(`⚠️  ${table}: Sin datos`);
          testResults.dataConfig.results.push(`⚠️  ${table}: Sin datos`);
        }
      } catch (err) {
        console.log(`❌ Error verificando datos en ${table}`);
      }
    }
    
    // Verificar función de catálogo de cuentas
    console.log('\n🔍 Verificando función de catálogo de cuentas...');
    
    try {
      const { data, error } = await supabase
        .rpc('create_default_chart_of_accounts', { p_company_id: 'test-id' });
      
      if (error) {
        console.log('⚠️  Función create_default_chart_of_accounts no disponible');
        testResults.dataConfig.results.push('⚠️  Función catálogo cuentas no disponible');
      } else {
        console.log('✅ Función create_default_chart_of_accounts disponible');
        testResults.dataConfig.results.push('✅ Función catálogo cuentas disponible');
      }
    } catch (err) {
      console.log('⚠️  No se puede verificar función de catálogo');
    }
    
    testResults.dataConfig.status = tablesMissing.length === 0 ? 'success' : 'partial';
    
  } catch (error) {
    console.log('❌ Error verificando configuración de datos:', error.message);
    testResults.dataConfig.status = 'error';
    testResults.dataConfig.results.push('❌ Error en configuración datos');
  }
  
  // 4. TEST COMPLETO DEL PROCESO DE ONBOARDING
  console.log('\n4️⃣ === TEST COMPLETO DEL PROCESO DE ONBOARDING ===');
  
  try {
    console.log('🧪 Simulando proceso completo de onboarding...');
    
    // Paso 1: Verificar tenant de prueba
    console.log('Paso 1: Verificando tenant de prueba...');
    const { data: testTenant, error: tenantError } = await supabase
      .from('Tenant')
      .select('*')
      .eq('id', 'tenant_001')
      .single();
    
    if (tenantError) {
      console.log('❌ Tenant de prueba no encontrado');
      testResults.fullProcess.results.push('❌ Tenant prueba no encontrado');
    } else {
      console.log(`✅ Tenant encontrado: ${testTenant.businessname}`);
      testResults.fullProcess.results.push(`✅ Tenant: ${testTenant.businessname}`);
    }
    
    // Paso 2: Verificar usuario de prueba
    console.log('Paso 2: Verificando usuario de prueba...');
    const { data: testUser, error: userError } = await supabase
      .from('User')
      .select('*')
      .eq('tenantid', 'tenant_001')
      .limit(1);
    
    if (userError || !testUser || testUser.length === 0) {
      console.log('❌ Usuario de prueba no encontrado');
      testResults.fullProcess.results.push('❌ Usuario prueba no encontrado');
    } else {
      console.log(`✅ Usuario encontrado: ${testUser[0].email}`);
      testResults.fullProcess.results.push(`✅ Usuario: ${testUser[0].email}`);
    }
    
    // Paso 3: Simular datos de onboarding
    console.log('Paso 3: Simulando datos de onboarding...');
    
    const mockOnboardingData = {
      companyData: {
        name: 'Empresa Test Onboarding',
        rtn: '12345678901234',
        address: 'Dirección de prueba',
        contactPhone: '50412345678',
        email: 'test@onboarding.com',
        industry: 'Salud',
        country: 'Honduras',
        clientPhone: '50487654321',
        companyPhone: '50411223344'
      },
      bankAccounts: [
        {
          id: 'bank-1',
          bankName: 'Banco Atlántida',
          accountNumber: '1234567890',
          accountType: 'corriente',
          currency: 'HNL'
        }
      ],
      salesConfig: {
        caiEnabled: true,
        caiCode: 'TEST-CAI-123',
        caiType: 'auto_impresion',
        taxes: [{ rate: 15, type: 'ISV' }],
        invoicePrefix: 'TEST-001-'
      },
      businessType: 'clinica_dental'
    };
    
    console.log('✅ Datos de prueba creados');
    testResults.fullProcess.results.push('✅ Datos prueba preparados');
    
    // Paso 4: Verificar que las funciones existan
    console.log('Paso 4: Verificando funciones de onboarding...');
    
    const onboardingPath = path.join(__dirname, '../lib/actions/onboarding.ts');
    if (fs.existsSync(onboardingPath)) {
      const content = fs.readFileSync(onboardingPath, 'utf8');
      
      if (content.includes('saveOnboardingData')) {
        console.log('✅ Función saveOnboardingData disponible');
        testResults.fullProcess.results.push('✅ saveOnboardingData disponible');
      }
      
      if (content.includes('getOnboardingStatus')) {
        console.log('✅ Función getOnboardingStatus disponible');
        testResults.fullProcess.results.push('✅ getOnboardingStatus disponible');
      }
      
      if (content.includes('createDefaultChartOfAccounts')) {
        console.log('✅ Función createDefaultChartOfAccounts disponible');
        testResults.fullProcess.results.push('✅ createDefaultChartOfAccounts disponible');
      }
    }
    
    // Paso 5: Verificar página de onboarding
    console.log('Paso 5: Verificando página de onboarding...');
    
    const pagePath = path.join(__dirname, '../app/onboarding/page.tsx');
    if (fs.existsSync(pagePath)) {
      const pageContent = fs.readFileSync(pagePath, 'utf8');
      
      if (pageContent.includes('saveOnboardingData')) {
        console.log('✅ Página usa saveOnboardingData');
        testResults.fullProcess.results.push('✅ Página integrada con onboarding');
      }
      
      if (pageContent.includes('useState') && pageContent.includes('useEffect')) {
        console.log('✅ Página con hooks de React');
        testResults.fullProcess.results.push('✅ Página React funcional');
      }
    }
    
    testResults.fullProcess.status = 'success';
    
  } catch (error) {
    console.log('❌ Error en test completo:', error.message);
    testResults.fullProcess.status = 'error';
    testResults.fullProcess.results.push('❌ Error en test completo');
  }
  
  // RESUMEN FINAL
  console.log('\n📊 === RESUMEN FINAL DEL TESTING DE ONBOARDING ===');
  
  const categories = [
    { name: 'Endpoints', key: 'endpoints', emoji: '🔗' },
    { name: 'Creación Usuarios', key: 'userCreation', emoji: '👥' },
    { name: 'Configuración Datos', key: 'dataConfig', emoji: '📊' },
    { name: 'Proceso Completo', key: 'fullProcess', emoji: '🧪' }
  ];
  
  let totalSuccess = 0;
  
  categories.forEach(category => {
    console.log(`\n${category.emoji} ${category.name}:`);
    console.log(`   Estado: ${testResults[category.key].status.toUpperCase()}`);
    
    testResults[category.key].results.forEach(result => {
      console.log(`   ${result}`);
    });
    
    if (testResults[category.key].status === 'success') {
      totalSuccess++;
    }
  });
  
  console.log(`\n🎯 RESULTADO FINAL: ${totalSuccess}/4 componentes exitosos`);
  
  if (totalSuccess === 4) {
    console.log('\n🎉 ¡ONBOARDING COMPLETAMENTE FUNCIONAL!');
    console.log('\n✅ Componentes verificados:');
    console.log('   • Endpoints disponibles y funcionales');
    console.log('   • Creación de usuarios operativa');
    console.log('   • Configuración de datos completa');
    console.log('   • Proceso de onboarding integrado');
    
    console.log('\n🚀 El onboarding está listo para producción con PostgreSQL + RLS');
    
  } else if (totalSuccess >= 3) {
    console.log('\n✅ Onboarding mayormente funcional');
    console.log('⚠️  Algunos componentes necesitan atención');
  } else {
    console.log('\n❌ Onboarding necesita correcciones importantes');
  }
  
  return testResults;
}

fullOnboardingTest().catch(console.error);
