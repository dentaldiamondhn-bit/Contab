const { createClient } = require('@supabase/supabase-js');

// Configuración de Supabase
const supabaseUrl = 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyAuthId() {
  console.log('🔍 Verificando campo authId después del SQL...\n');
  
  try {
    // 1. Verificar estructura de la tabla User
    console.log('1️⃣ Verificando estructura de tabla User...');
    const { data: columns, error: columnError } = await supabase
      .from('User')
      .select('id, email, authId, tenantid, role')
      .limit(1);
    
    if (columnError) {
      console.log('❌ Error verificando estructura:', columnError.message);
      return;
    }
    
    console.log('✅ Estructura verificada - Campos disponibles:', Object.keys(columns[0] || {}));
    
    // 2. Verificar usuarios con authId
    console.log('\n2️⃣ Verificando usuarios con authId...');
    const { data: users, error: userError } = await supabase
      .from('User')
      .select('id, email, authId, tenantid, role')
      .limit(5);
    
    if (userError) {
      console.log('❌ Error obteniendo usuarios:', userError.message);
      return;
    }
    
    console.log('✅ Usuarios encontrados:');
    users.forEach(user => {
      console.log(`   📧 ${user.email} - authId: ${user.authId || 'SIN AUTHID'} - Tenant: ${user.tenantid || 'SIN TENANT'}`);
    });
    
    // 3. Probar búsqueda por authId
    console.log('\n3️⃣ Probando búsqueda por authId...');
    if (users.length > 0 && users[0].authId) {
      const testAuthId = users[0].authId;
      console.log(`🔍 Buscando usuario con authId: ${testAuthId}`);
      
      const { data: userData, error: searchError } = await supabase
        .from('User')
        .select('tenantid, role, createdat')
        .eq('authId', testAuthId)
        .single();
      
      if (searchError) {
        console.log('❌ Error buscando por authId:', searchError.message);
      } else {
        console.log('✅ Usuario encontrado por authId:', userData);
        
        // 4. Simular API call completa
        console.log('\n4️⃣ Simulando API call completa...');
        
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

        console.log('✅ Respuesta API final:');
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
    } else {
      console.log('⚠️ No hay usuarios con authId para probar');
    }
    
  } catch (error) {
    console.log('❌ Error general:', error.message);
  }
}

verifyAuthId().catch(console.error);
