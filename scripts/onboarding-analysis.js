const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function analyzeOnboarding() {
  console.log('🔍 === ANÁLISIS COMPLETO DEL ONBOARDING PARA NUEVOS TENANTS ===\n');
  
  const analysis = {
    currentImplementation: { status: 'pending', issues: [], recommendations: [] },
    databaseTables: { status: 'pending', tables: [], missing: [] },
    supabaseMigration: { status: 'pending', changes: [] },
    tenantCreation: { status: 'pending', flow: [] },
    userCreation: { status: 'pending', process: [] }
  };
  
  // 1. Analizar implementación actual
  console.log('1️⃣ === ANÁLISIS DE IMPLEMENTACIÓN ACTUAL ===');
  
  try {
    // Verificar archivo de onboarding
    const onboardingPath = path.join(__dirname, '../lib/actions/onboarding.ts');
    if (fs.existsSync(onboardingPath)) {
      const content = fs.readFileSync(onboardingPath, 'utf8');
      
      console.log('📄 Archivo onboarding.ts encontrado');
      
      // Verificar si usa Prisma (obsoleto)
      if (content.includes('from "@/lib/db"')) {
        console.log('❌ Usa Prisma (obsoleto para PostgreSQL)');
        analysis.currentImplementation.issues.push('❌ onboarding.ts usa Prisma - necesita migración a Supabase');
        analysis.currentImplementation.recommendations.push('🔄 Migrar onboarding.ts a Supabase');
      } else {
        console.log('✅ No usa Prisma');
      }
      
      // Verificar si usa auth de NextAuth
      if (content.includes('from "@/lib/auth"')) {
        console.log('❌ Usa NextAuth (reemplazado por Clerk)');
        analysis.currentImplementation.issues.push('❌ onboarding.ts usa NextAuth - necesita Clerk');
        analysis.currentImplementation.recommendations.push('🔄 Actualizar auth a Clerk');
      }
      
      // Analizar funciones
      if (content.includes('saveOnboardingData')) {
        console.log('✅ Función saveOnboardingData existe');
        
        // Verificar tablas que usa
        const tables = ['companies', 'company_bank_accounts', 'sales_configuration', 'onboarding_companies'];
        tables.forEach(table => {
          if (content.includes(table)) {
            console.log(`✅ Usa tabla: ${table}`);
          } else {
            console.log(`⚠️  No usa tabla: ${table}`);
          }
        });
      }
      
    } else {
      console.log('❌ Archivo onboarding.ts no encontrado');
      analysis.currentImplementation.issues.push('❌ Archivo onboarding.ts no encontrado');
    }
    
    // Verificar página de onboarding
    const pagePath = path.join(__dirname, '../app/onboarding/page.tsx');
    if (fs.existsSync(pagePath)) {
      console.log('✅ Página de onboarding encontrada');
      
      const pageContent = fs.readFileSync(pagePath, 'utf8');
      if (pageContent.includes('saveOnboardingData')) {
        console.log('✅ Página usa saveOnboardingData');
      }
    } else {
      console.log('❌ Página de onboarding no encontrada');
      analysis.currentImplementation.issues.push('❌ Página onboarding no encontrada');
    }
    
    analysis.currentImplementation.status = analysis.currentImplementation.issues.length > 0 ? 'needs_update' : 'ok';
    
  } catch (error) {
    console.log('❌ Error analizando implementación:', error.message);
    analysis.currentImplementation.status = 'error';
  }
  
  // 2. Verificar tablas de base de datos
  console.log('\n2️⃣ === VERIFICACIÓN DE TABLAS DE BASE DE DATOS ===');
  
  try {
    const requiredTables = [
      'companies',
      'company_bank_accounts', 
      'chart_of_accounts',
      'sales_configuration',
      'onboarding_companies'
    ];
    
    for (const table of requiredTables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          if (error.code === 'PGRST116') {
            console.log(`❌ Tabla ${table}: NO EXISTE`);
            analysis.databaseTables.missing.push(table);
          } else {
            console.log(`⚠️  Tabla ${table}: ${error.message}`);
          }
        } else {
          console.log(`✅ Tabla ${table}: EXISTE`);
          analysis.databaseTables.tables.push(table);
        }
      } catch (err) {
        console.log(`❌ Error verificando tabla ${table}: ${err.message}`);
        analysis.databaseTables.missing.push(table);
      }
    }
    
    analysis.databaseTables.status = analysis.databaseTables.missing.length > 0 ? 'incomplete' : 'complete';
    
  } catch (error) {
    console.log('❌ Error verificando tablas:', error.message);
    analysis.databaseTables.status = 'error';
  }
  
  // 3. Analizar migración necesaria a Supabase
  console.log('\n3️⃣ === ANÁLISIS DE MIGRACIÓN A SUPABASE ===');
  
  try {
    console.log('🔄 Cambios necesarios para onboarding:');
    
    // Cambio 1: Actualizar imports
    console.log('1. Actualizar imports en onboarding.ts:');
    console.log('   - Remover: import { db } from "@/lib/db"');
    console.log('   - Agregar: import { supabase } from "@/lib/supabase-db"');
    analysis.supabaseMigration.changes.push('Actualizar imports a Supabase');
    
    // Cambio 2: Actualizar auth
    console.log('2. Actualizar autenticación:');
    console.log('   - Remover: import { auth } from "@/lib/auth"');
    console.log('   - Agregar: import { auth } from "@clerk/nextjs/server"');
    analysis.supabaseMigration.changes.push('Actualizar auth a Clerk');
    
    // Cambio 3: Migrar queries
    console.log('3. Migrar queries de Prisma a Supabase:');
    console.log('   - db.$queryRaw → supabase.from()');
    console.log('   - db.$executeRaw → supabase.from().insert()');
    analysis.supabaseMigration.changes.push('Migrar queries a Supabase');
    
    // Cambio 4: Actualizar tenant_id
    console.log('4. Actualizar manejo de tenant_id:');
    console.log('   - Usar tenantid (minúsculas) para tabla User');
    console.log('   - Configurar contexto de tenant');
    analysis.supabaseMigration.changes.push('Actualizar tenant_id a Supabase');
    
    analysis.supabaseMigration.status = 'needs_migration';
    
  } catch (error) {
    console.log('❌ Error analizando migración:', error.message);
    analysis.supabaseMigration.status = 'error';
  }
  
  // 4. Analizar flujo de creación de tenants
  console.log('\n4️⃣ === ANÁLISIS DE FLUJO DE CREACIÓN DE TENANTS ===');
  
  try {
    console.log('🏢 Flujo actual de creación de tenants:');
    
    // Paso 1: Verificar si existe tenant
    console.log('1. Verificar tenant del usuario:');
    const { data: existingTenants } = await supabase
      .from('Tenant')
      .select('*')
      .limit(3);
    
    console.log(`   - Tenants existentes: ${existingTenants?.length || 0}`);
    analysis.tenantCreation.flow.push(`Tenants existentes: ${existingTenants?.length || 0}`);
    
    // Paso 2: Verificar usuarios
    console.log('2. Verificar usuarios existentes:');
    const { data: existingUsers } = await supabase
      .from('User')
      .select('*')
      .limit(3);
    
    console.log(`   - Usuarios existentes: ${existingUsers?.length || 0}`);
    analysis.tenantCreation.flow.push(`Usuarios existentes: ${existingUsers?.length || 0}`);
    
    // Paso 3: Flujo ideal
    console.log('3. Flujo ideal de onboarding:');
    console.log('   a) Usuario se registra con Clerk');
    console.log('   b) Se crea/verifica Tenant');
    console.log('   c) Se crea User asociado al Tenant');
    console.log('   d) Se ejecuta onboarding saveOnboardingData');
    console.log('   e) Se crean tablas relacionadas (companies, bank_accounts, etc.)');
    
    analysis.tenantCreation.flow.push('Flujo ideal identificado');
    analysis.tenantCreation.status = 'analyzed';
    
  } catch (error) {
    console.log('❌ Error analizando flujo de tenants:', error.message);
    analysis.tenantCreation.status = 'error';
  }
  
  // 5. Analizar creación de usuarios
  console.log('\n5️⃣ === ANÁLISIS DE CREACIÓN DE USUARIOS ===');
  
  try {
    console.log('👥 Proceso de creación de usuarios:');
    
    // Verificar estructura de usuarios
    const { data: users, error: usersError } = await supabase
      .from('User')
      .select('*')
      .limit(1);
    
    if (!usersError && users.length > 0) {
      const sampleUser = users[0];
      console.log('Estructura de usuario:');
      Object.keys(sampleUser).forEach(key => {
        console.log(`   - ${key}: ${typeof sampleUser[key]}`);
      });
      
      analysis.userCreation.process.push('Estructura de usuarios verificada');
      
      // Verificar campos clave
      const requiredFields = ['id', 'email', 'tenantid', 'role', 'authId'];
      const hasRequiredFields = requiredFields.every(field => sampleUser.hasOwnProperty(field));
      
      if (hasRequiredFields) {
        console.log('✅ Campos requeridos presentes');
        analysis.userCreation.process.push('Campos requeridos completos');
      } else {
        console.log('❌ Faltan campos requeridos');
        analysis.userCreation.process.push('Faltan campos requeridos');
      }
    }
    
    analysis.userCreation.status = 'analyzed';
    
  } catch (error) {
    console.log('❌ Error analizando usuarios:', error.message);
    analysis.userCreation.status = 'error';
  }
  
  // Resumen y recomendaciones
  console.log('\n📊 === RESUMEN DEL ANÁLISIS DE ONBOARDING ===');
  
  const categories = [
    { name: 'Implementación Actual', key: 'currentImplementation', emoji: '📄' },
    { name: 'Tablas de BD', key: 'databaseTables', emoji: '🗄️' },
    { name: 'Migración a Supabase', key: 'supabaseMigration', emoji: '🔄' },
    { name: 'Creación de Tenants', key: 'tenantCreation', emoji: '🏢' },
    { name: 'Creación de Usuarios', key: 'userCreation', emoji: '👥' }
  ];
  
  categories.forEach(category => {
    console.log(`\n${category.emoji} ${category.name}:`);
    console.log(`   Estado: ${analysis[category.key].status.toUpperCase()}`);
    
    if (analysis[category.key].issues && analysis[category.key].issues.length > 0) {
      console.log('   Issues:');
      analysis[category.key].issues.forEach(issue => console.log(`     ${issue}`));
    }
    
    if (analysis[category.key].recommendations && analysis[category.key].recommendations.length > 0) {
      console.log('   Recomendaciones:');
      analysis[category.key].recommendations.forEach(rec => console.log(`     ${rec}`));
    }
  });
  
  // Recomendaciones finales
  console.log('\n🎯 === RECOMENDACIONES FINALES ===');
  
  console.log('\n📋 ACCIONES INMEDIATAS REQUERIDAS:');
  console.log('1. 🔄 Migrar onboarding.ts a Supabase');
  console.log('2. 🔐 Actualizar autenticación a Clerk');
  console.log('3. 🗄️ Crear tablas faltantes en Supabase');
  console.log('4. 🔗 Integrar onboarding con tenant creation');
  
  console.log('\n🚀 MEJORAS OPCIONALES:');
  console.log('1. 📊 Dashboard de progreso de onboarding');
  console.log('2. 🎯 Onboarding guiado por tipo de negocio');
  console.log('3. 📝 Plantillas predefinidas por industria');
  console.log('4. 🔔 Notificaciones de completion');
  
  console.log('\n✅ ESTADO FINAL:');
  const criticalIssues = analysis.currentImplementation.issues.length + 
                        analysis.databaseTables.missing.length;
  
  if (criticalIssues === 0) {
    console.log('🎉 Onboarding está funcional y compatible con PostgreSQL');
  } else if (criticalIssues <= 2) {
    console.log('⚠️  Onboarding necesita actualizaciones menores');
  } else {
    console.log('❌ Onboarding necesita migración completa');
  }
  
  return analysis;
}

analyzeOnboarding().catch(console.error);
