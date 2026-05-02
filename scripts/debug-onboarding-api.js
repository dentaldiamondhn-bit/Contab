const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugOnboardingAPI() {
  console.log('🔍 DEBUGGING ONBOARDING API\n');
  
  // 1. Verificar tabla User
  console.log('1️⃣ Verificando tabla User...');
  try {
    const { data: users, error } = await supabase
      .from('User')
      .select('id, email, authId, tenantid, role')
      .limit(5);
    
    if (error) {
      console.log('❌ Error en User:', error.message);
    } else {
      console.log('✅ Usuarios encontrados:');
      users.forEach(user => {
        console.log(`   📧 ${user.email} - authId: ${user.authId || 'SIN AUTHID'} - Tenant: ${user.tenantid || 'SIN TENANT'}`);
      });
    }
  } catch (err) {
    console.log('❌ Error crítico User:', err.message);
  }
  
  // 2. Verificar tabla onboarding_companies
  console.log('\n2️⃣ Verificando tabla onboarding_companies...');
  try {
    const { data: onboarding, error } = await supabase
      .from('onboarding_companies')
      .select('*')
      .limit(5);
    
    if (error) {
      console.log('❌ Error en onboarding_companies:', error.message);
    } else {
      console.log('✅ Registros de onboarding:', onboarding.length || 0);
      onboarding.forEach(record => {
        console.log(`   🏢 ${record.company_name} - User: ${record.user_id} - Completado: ${record.setup_completed}`);
      });
    }
  } catch (err) {
    console.log('❌ Error crítico onboarding_companies:', err.message);
  }
  
  // 3. Verificar tabla companies
  console.log('\n3️⃣ Verificando tabla companies...');
  try {
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .limit(5);
    
    if (error) {
      console.log('❌ Error en companies:', error.message);
    } else {
      console.log('✅ Compañías encontradas:', companies.length || 0);
      companies.forEach(company => {
        console.log(`   🏢 ${company.name} - Tenant: ${company.tenant_id}`);
      });
    }
  } catch (err) {
    console.log('❌ Error crítico companies:', err.message);
  }
  
  // 4. Simular API call con authId de prueba
  console.log('\n4️⃣ Simulando API call...');
  const testAuthId = 'temp-clerk-id-admin-user-uuid';
  
  try {
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('tenantid, role, createdat')
      .eq('authId', testAuthId)
      .single();

    if (userError) {
      console.log('❌ Error buscando usuario:', userError.message);
      if (userError.code === 'PGRST116') {
        console.log('🔄 Usuario no encontrado - necesita onboarding');
        console.log('✅ Respuesta API simulada:');
        console.log(JSON.stringify({
          hasTenant: false,
          needsOnboarding: true,
          message: 'Usuario necesita crear tenant y completar onboarding'
        }, null, 2));
      }
    } else {
      console.log('✅ Usuario encontrado:', userData);
      
      // Verificar onboarding
      const { data: onboardingData, error: onboardingError } = await supabase
        .from('onboarding_companies')
        .select('setup_completed, created_at')
        .eq('user_id', testAuthId)
        .single();

      let needsOnboarding = false;
      let hasCompletedOnboarding = false;

      if (onboardingError) {
        if (onboardingError.code === 'PGRST116') {
          needsOnboarding = true;
          console.log('🔄 No tiene registro de onboarding - necesita onboarding');
        } else {
          console.log('❌ Error verificando onboarding:', onboardingError.message);
        }
      } else {
        hasCompletedOnboarding = onboardingData.setup_completed;
        needsOnboarding = !onboardingData.setup_completed;
        console.log(`✅ Onboarding encontrado - Completado: ${hasCompletedOnboarding}`);
      }

      // Verificar companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, created_at')
        .eq('tenant_id', userData.tenantid)
        .limit(1);

      const hasCompanies = !companiesError && companiesData.length > 0;
      console.log(`✅ Compañías encontradas: ${companiesData?.length || 0}`);

      // Determinar redirección
      let redirectTo = '/dashboard';
      let status = 'configured';

      if (!userData.tenantid) {
        redirectTo = '/onboarding';
        status = 'needs_tenant';
      } else if (needsOnboarding || !hasCompletedOnboarding) {
        redirectTo = '/onboarding';
        status = 'needs_onboarding';
      } else if (!hasCompanies) {
        redirectTo = '/onboarding';
        status = 'needs_company_setup';
      }

      console.log('✅ Respuesta API simulada:');
      console.log(JSON.stringify({
        hasTenant: !!userData.tenantid,
        needsOnboarding,
        hasCompletedOnboarding,
        hasCompanies,
        redirectTo,
        status,
        user: userData
      }, null, 2));
    }
  } catch (err) {
    console.log('❌ Error en simulación API:', err.message);
  }
  
  console.log('\n🎯 DIAGNÓSTICO FINAL:');
  console.log('Si el usuario existe pero no tiene onboarding, debería redirigir a /onboarding');
  console.log('Si el usuario no existe, debería redirigir a /onboarding');
  console.log('Si todo está completo, debería redirigir a /dashboard');
}

debugOnboardingAPI().catch(console.error);
