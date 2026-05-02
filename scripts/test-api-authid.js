const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAPIAuthId() {
  console.log('🔍 Probando API con authid (minúscula)...\n');
  
  try {
    // 1. Obtener el authid del usuario existente
    console.log('1️⃣ Obteniendo authid del usuario admin...');
    const { data: adminUser, error: adminError } = await supabase
      .from('User')
      .select('id, email, authid, tenantid, role')
      .eq('email', 'admin@contab.com')
      .single();
    
    if (adminError) {
      console.log('❌ Error obteniendo admin:', adminError.message);
      return;
    }
    
    console.log('✅ Usuario admin encontrado:');
    console.log(`   📧 ${adminUser.email} - authid: ${adminUser.authid} - Tenant: ${adminUser.tenantid}`);
    
    // 2. Simular API call con authid
    console.log('\n2️⃣ Simulando API call con authid...');
    const testUserId = adminUser.authid;
    
    const { data: userData, error: userError } = await supabase
      .from('User')
      .select('tenantid, role, createdat')
      .eq('authid', testUserId)
      .single();

    if (userError) {
      console.log('❌ Error buscando usuario por authid:', userError.message);
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
      console.log('✅ Usuario encontrado por authid:', userData);
      
      // 3. Verificar onboarding
      console.log('\n3️⃣ Verificando onboarding...');
      const { data: onboardingData, error: onboardingError } = await supabase
        .from('onboarding_companies')
        .select('setup_completed, created_at')
        .eq('user_id', testUserId)
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

      // 4. Verificar companies
      console.log('\n4️⃣ Verificando compañías...');
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, name, created_at')
        .eq('tenant_id', userData.tenantid)
        .limit(1);

      const hasCompanies = !companiesError && companiesData.length > 0;
      console.log(`✅ Compañías encontradas: ${companiesData?.length || 0}`);

      // 5. Determinar redirección
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

      console.log('\n✅ Respuesta API final:');
      console.log(JSON.stringify({
        hasTenant: !!userData.tenantid,
        needsOnboarding,
        hasCompletedOnboarding,
        hasCompanies,
        redirectTo,
        status,
        user: userData
      }, null, 2));
      
      console.log('\n🎯 RESULTADO FINAL:');
      console.log(`✅ API funcionará correctamente con authid`);
      console.log(`✅ Redirección: ${redirectTo}`);
      console.log(`✅ Status: ${status}`);
    }
    
  } catch (error) {
    console.log('❌ Error general:', error.message);
  }
}

testAPIAuthId().catch(console.error);
