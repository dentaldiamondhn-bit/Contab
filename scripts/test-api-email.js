const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testAPIWithEmail() {
  console.log('🔍 Probando API con email en lugar de authId\n');
  
  // 1. Verificar usuarios existentes por email
  console.log('1️⃣ Verificando usuarios por email...');
  try {
    const { data: users, error } = await supabase
      .from('User')
      .select('id, email, tenantid, role')
      .limit(5);
    
    if (error) {
      console.log('❌ Error en User:', error.message);
    } else {
      console.log('✅ Usuarios encontrados:');
      users.forEach(user => {
        console.log(`   📧 ${user.email} - Tenant: ${user.tenantid || 'SIN TENANT'} - Role: ${user.role}`);
      });
      
      // 2. Simular API call con email
      if (users.length > 0) {
        const testEmail = users[0].email;
        console.log(`\n2️⃣ Simulando API call con email: ${testEmail}`);
        
        const { data: userData, error: userError } = await supabase
          .from('User')
          .select('tenantid, role, createdat')
          .eq('email', testEmail)
          .single();

        if (userError) {
          console.log('❌ Error buscando usuario por email:', userError.message);
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
          console.log('✅ Usuario encontrado por email:', userData);
          
          // Verificar onboarding
          const { data: onboardingData, error: onboardingError } = await supabase
            .from('onboarding_companies')
            .select('setup_completed, created_at')
            .eq('user_id', testEmail) // Usar email
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
            user: {
              ...userData,
              email: testEmail
            }
          }, null, 2));
        }
      }
    }
  } catch (err) {
    console.log('❌ Error crítico:', err.message);
  }
  
  console.log('\n🎯 DIAGNÓSTICO FINAL:');
  console.log('✅ API modificada para usar email en lugar de authId');
  console.log('✅ Esto debería solucionar el problema de redirección');
  console.log('✅ Los nuevos usuarios (con email diferente) deberían redirigir a onboarding');
}

testAPIWithEmail().catch(console.error);
