const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAuthIdStatus() {
  console.log('🔍 Verificando estado actual del campo authId...\n');
  
  try {
    // 1. Verificar si el campo existe usando una consulta segura
    console.log('1️⃣ Verificando usuarios existentes...');
    const { data: users, error: userError } = await supabase
      .from('User')
      .select('id, email, tenantid, role')
      .limit(3);
    
    if (userError) {
      console.log('❌ Error obteniendo usuarios:', userError.message);
      return;
    }
    
    console.log('✅ Usuarios existentes:');
    users.forEach(user => {
      console.log(`   📧 ${user.email} - Tenant: ${user.tenantid || 'SIN TENANT'}`);
    });
    
    // 2. Intentar verificar si authId existe con una consulta condicional
    console.log('\n2️⃣ Verificando si authId existe...');
    try {
      const { data: authIdUsers, error: authIdError } = await supabase
        .from('User')
        .select('id, email, authId')
        .limit(3);
      
      if (authIdError) {
        if (authIdError.message.includes('authId does not exist')) {
          console.log('❌ Campo authId NO existe - Necesitas ejecutar el SQL');
          console.log('\n📋 SQL requerido (copia y pega en Supabase Dashboard):');
          console.log('ALTER TABLE "User" ADD COLUMN IF NOT EXISTS authId TEXT;');
          console.log('CREATE INDEX IF NOT EXISTS idx_user_authId ON "User"(authId);');
          console.log('UPDATE "User" SET authId = \'temp-clerk-id-\' || id WHERE authId IS NULL;');
        } else {
          console.log('❌ Error verificando authId:', authIdError.message);
        }
      } else {
        console.log('✅ Campo authId existe');
        console.log('Usuarios con authId:');
        authIdUsers.forEach(user => {
          console.log(`   📧 ${user.email} - authId: ${user.authId || 'NULL'}`);
        });
      }
    } catch (err) {
      console.log('❌ Error verificando authId:', err.message);
    }
    
    // 3. Verificar estado actual del onboarding
    console.log('\n3️⃣ Verificando estado de onboarding...');
    const { data: onboarding, error: onboardingError } = await supabase
      .from('onboarding_companies')
      .select('*')
      .limit(3);
    
    if (onboardingError) {
      console.log('❌ Error verificando onboarding:', onboardingError.message);
    } else {
      console.log(`✅ Registros de onboarding: ${onboarding.length}`);
      onboarding.forEach(record => {
        console.log(`   🏢 ${record.company_name} - User: ${record.user_id}`);
      });
    }
    
    // 4. Verificar compañías
    console.log('\n4️⃣ Verificando compañías...');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .limit(3);
    
    if (companiesError) {
      console.log('❌ Error verificando compañías:', companiesError.message);
    } else {
      console.log(`✅ Compañías encontradas: ${companies.length}`);
      companies.forEach(company => {
        console.log(`   🏢 ${company.name} - Tenant: ${company.tenant_id}`);
      });
    }
    
    console.log('\n🎯 DIAGNÓSTICO FINAL:');
    console.log('Si authId no existe, ejecuta el SQL manualmente en Supabase Dashboard');
    console.log('Si authId existe, el problema puede estar en otro lugar');
    
  } catch (error) {
    console.log('❌ Error general:', error.message);
  }
}

checkAuthIdStatus().catch(console.error);
